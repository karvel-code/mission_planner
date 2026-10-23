# Every spacecraft in the catalog (PLAN.md section 4b).
class CreateSpacecraft < ActiveRecord::Migration[8.1]
  def change
    create_table :spacecraft do |t|
      t.string :name, null: false
      t.string :slug, null: false, index: { unique: true }
      t.string :size
      t.float :mass_kg
      t.integer :capacity, null: false
      t.float :range_km, null: false
      t.float :speed_kmh, null: false
      t.boolean :gravity_generator, null: false
      t.float :min_operating_temp_c, null: false
      t.float :max_operating_temp_c, null: false
      # Fields in the YAML that the app doesn't know yet.
      t.jsonb :extra_attributes, null: false, default: {}

      t.timestamps
    end
  end
end
