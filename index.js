const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { v7: uuidv7 } = require("uuid");
const db = require("./database")

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Simple in-memory storage
// let profiles = []; before db was introduced

// Test route
app.get("/", (req, res) => {
    res.send("API is running 🚀");
});

// POST /api/profiles
app.post("/api/profiles", async (req, res) => {
    try {
        const name = req.body?.name;

        if (!name || name.trim() === "") {
            return res.status(400).json({
                status: "error",
                message: "Name is required"
            });
        }

        if (typeof name !== "string") {
            return res.status(422).json({
                status: "error",
                message: "Name must be a string"
            });
        }

        // 🔥 Check DB for existing profile
        db.get(
            "SELECT * FROM profiles WHERE LOWER(name) = LOWER(?)",
            [name],
            async (err, row) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        status: "error",
                        message: "Database query failed"
                    });
                }
                if (row) {
                    return res.status(200).json({
                        status: "success",
                        message: "Profile already exists",
                        data: row
                    });
                }

                // 🔥 Call APIs
                const [genderRes, ageRes, countryRes] = await Promise.all([
                    axios.get(`https://api.genderize.io?name=${encodeURIComponent(name)}`),
                    axios.get(`https://api.agify.io?name=${encodeURIComponent(name)}`),
                    axios.get(`https://api.nationalize.io?name=${encodeURIComponent(name)}`)
                ]);

                const { gender, probability, count } = genderRes.data;
                const { age } = ageRes.data;
                const countries = countryRes.data.country;

                if (!gender || count === 0) {
                    return res.status(502).json({
                        status: "error",
                        message: "Genderize returned an invalid response"
                    });
                }

                if (age === null || age === undefined) {
                    return res.status(502).json({
                        status: "error",
                        message: "Agify returned an invalid response"
                    });
                }

                if (!countries || countries.length === 0) {
                    return res.status(502).json({
                        status: "error",
                        message: "Nationalize returned an invalid response"
                    });
                }

                const bestCountry = countries.reduce((prev, curr) =>
                    curr.probability > prev.probability ? curr : prev
                );

                let age_group;
                if (age <= 12) age_group = "child";
                else if (age <= 19) age_group = "teenager";
                else if (age <= 59) age_group = "adult";
                else age_group = "senior";

                const id = uuidv7();
                const created_at = new Date().toISOString();

                const query = `
                  INSERT INTO profiles (
                    id, name, gender, gender_probability, sample_size,
                    age, age_group, country_id, country_name,
                    country_probability, created_at
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const values = [
                    id,
                    name.toLowerCase(),
                    gender,
                    probability,
                    count,
                    age,
                    age_group,
                    bestCountry.country_id,
                    "Unknown", // optional
                    bestCountry.probability,
                    created_at
                ];

                db.run(query, values, function (err) {
                    if (err) {
                        console.log(err);
                        return res.status(500).json({
                            status: "error",
                            message: "Database insert failed"
                        });
                    }

                    return res.status(201).json({
                        status: "success",
                        data: {
                            id,
                            name: name.toLowerCase(),
                            gender,
                            gender_probability: probability,
                            sample_size: count,
                            age,
                            age_group,
                            country_id: bestCountry.country_id,
                            country_probability: bestCountry.probability,
                            created_at
                        }
                    });
                });
            }
        );
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: "error",
            message: "Something went wrong"
        });
    }
});

// get all profiles
app.get("/api/profiles", (req, res) => {
    const { gender, country_id, age_group, sort_by, order, page = 1, limit = 10 } = req.query;

    let query = "SELECT id, name, gender, age, age_group, country_id FROM profiles WHERE 1=1";
    let params = [];

    // 🔍 Filtering
    if (gender) {
        query += " AND LOWER(gender) = LOWER(?)";
        params.push(gender);
    }

    if (country_id) {
        query += " AND LOWER(country_id) = LOWER(?)";
        params.push(country_id);
    }

    if (age_group) {
        query += " AND LOWER(age_group) = LOWER(?)";
        params.push(age_group);
    }

    // 🔽 Sorting
    if (sort_by) {
        const validFields = ["age", "name", "created_at"];
        if (validFields.includes(sort_by)) {
            query += ` ORDER BY ${sort_by}`;
            if (order && order.toLowerCase() === "desc") {
                query += " DESC";
            } else {
                query += " ASC";
            }
        }
    }

    // 📄 Pagination
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const offset = (pageNumber - 1) * limitNumber;

    query += " LIMIT ? OFFSET ?";
    params.push(limitNumber, offset);

    db.all(query, params, (err, rows) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                status: "error",
                message: "Database query failed"
            });
        }

        return res.status(200).json({
            status: "success",
            page: pageNumber,
            limit: limitNumber,
            count: rows.length,
            data: rows
        });
    });
});

// search
app.get("/api/profiles/search", (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({
            status: "error",
            message: "Search query is required"
        });
    }

    let query = "SELECT * FROM profiles WHERE 1=1";
    let params = [];

    const text = q.toLowerCase();

    if (text.includes("female")) {
        query += " AND gender = ?";
        params.push("female");
    }else if(text.includes("male")) {
        query += " AND gender = ?";
        params.push("male");
    }

// get single profile
app.get("/api/profiles/:id", (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM profiles WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                status: "error",
                message: "Database query failed"
            });
        }

        if (!row) {
            return res.status(404).json({
                status: "error",
                message: "Profile not found"
            });
        }

        return res.status(200).json({
            status: "success",
            data: row
        });
    });
});



// age groups
if (text.includes("child")) {
    query += " AND age <= 12";
}

if (text.includes("teen")) {
    query += " AND age BETWEEN 13 AND 19";
}

if (text.includes("young")) {
    query += " AND age BETWEEN 16 AND 24";
}

if (text.includes("adult")) {
    query += " AND age BETWEEN 20 AND 59";
}

if (text.includes("senior")) {
    query += " AND age >= 60";
}
// parse country
if (text.includes("nigeria")) {
    query += " AND country_id = ?";
    params.push("NG");
}

if (text.includes("usa") || text.includes("america")) {
    query += " AND country_id = ?";
    params.push("US");
}

// execute query
db.all(query, params, (err, rows) => {
    if (err) {
        console.log(err);
        return res.status(500).json({
            status: "error",
            message: "Database query failed"
        });
    }

    return res.status(200).json({
        status: "success",
        count: rows.length,
        data: rows
    });
});

})

// delete profile
app.delete("/api/profiles/:id", (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM profiles WHERE id = ?", [id], function (err) {
        if (err) {
            console.log(err);
            return res.status(500).json({
                status: "error",
                message: "Database delete failed"
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                status: "error",
                message: "Profile not found"
            });
        }

        return res.status(204).send();
    });
});





// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});