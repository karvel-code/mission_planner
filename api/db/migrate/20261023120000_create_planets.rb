# Every body in the catalog, the Sun included (PLAN.md section 4b).
class CreatePlanets < ActiveRecord::Migration[8.1]
  def change
    create_table :planets do |t|
      t.string :name, null: false
      t.string :slug, null: false, index: { unique: true }
      # Not `type`: Rails reserves that column for single-table inheritance.
      t.string :body_type, null: false
      t.float :radius_km, null: false
      t.float :distance_from_sun_km, null: false
      t.float :average_temperature_c, null: false
      t.float :gravity_m_per_s2, null: false
      t.float :radiation_levels_msv, null: false
      t.boolean :potentially_habitable
      t.string :weather_patterns
      t.string :moons, array: true, null: false, default: []
      # Fields in the YAML that the app doesn't know yet.
      t.jsonb :extra_attributes, null: false, default: {}

      t.timestamps
    end
  end
end
