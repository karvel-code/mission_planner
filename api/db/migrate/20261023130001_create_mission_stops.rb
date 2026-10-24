# One stop on a mission plan's route. Position 0 is the start (Earth).
class CreateMissionStops < ActiveRecord::Migration[8.1]
  def change
    create_table :mission_stops do |t|
      t.references :mission_plan, null: false, foreign_key: true, index: false
      # No cascade: a planet on a saved route cannot be deleted (docs/ASSUMPTIONS.md #25).
      t.references :planet, null: false, foreign_key: true
      t.integer :position, null: false

      t.timestamps
    end
    add_index :mission_stops, [ :mission_plan_id, :position ], unique: true
  end
end
