# Loads planets and spacecraft from the catalog file (MISSION_DATA_PATH, or
# data/data.yml at the repository root). Safe to run repeatedly: records are
# matched by slug and updated in place.
Catalog::Seeder.call
