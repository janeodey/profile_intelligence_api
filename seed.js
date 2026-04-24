const fs = require("fs");
const db = require("./database");
const { v7: uuidv7 } = require("uuid");

// read JSON file
const fileData = JSON.parse(fs.readFileSync("./profiles.json", "utf-8"));
const data =fileData.profiles

db.serialize(() => {
    data.forEach(profile => {
        const {
            name,
            gender,
            gender_probability,
            sample_size,
            age,
            age_group,
            country_id,
            country_probability
        } = profile;

        const id = uuidv7();
        const created_at = new Date().toISOString();

        // prevent duplicates using name
        db.get(
            "SELECT * FROM profiles WHERE LOWER(name) = LOWER(?)",
            [name],
            (err, row) => {
                if (row) {
                    console.log(`Skipping duplicate: ${name}`);
                } else {
                    db.run(
                        `INSERT INTO profiles (
                            id, name, gender, gender_probability,
                            sample_size, age, age_group,
                            country_id, country_name,
                            country_probability, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            id,
                            name.toLowerCase(),
                            gender,
                            gender_probability,
                            sample_size,
                            age,
                            age_group,
                            country_id,
                            "Unknown",
                            country_probability,
                            created_at
                        ],
                        (err) => {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log(`Inserted: ${name}`);
                            }
                        }
                    );
                }
            }
        );
    });
});