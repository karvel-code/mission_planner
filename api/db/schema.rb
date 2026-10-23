# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_23_120001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "planets", force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.string "body_type", null: false
    t.float "radius_km", null: false
    t.float "distance_from_sun_km", null: false
    t.float "average_temperature_c", null: false
    t.float "gravity_m_per_s2", null: false
    t.float "radiation_levels_msv", null: false
    t.boolean "potentially_habitable"
    t.string "weather_patterns"
    t.string "moons", default: [], null: false, array: true
    t.jsonb "extra_attributes", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_planets_on_slug", unique: true
  end

  create_table "spacecraft", force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.string "size"
    t.float "mass_kg"
    t.integer "capacity", null: false
    t.float "range_km", null: false
    t.float "speed_kmh", null: false
    t.boolean "gravity_generator", null: false
    t.float "min_operating_temp_c", null: false
    t.float "max_operating_temp_c", null: false
    t.jsonb "extra_attributes", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_spacecraft_on_slug", unique: true
  end
end
