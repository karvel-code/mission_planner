# A saved mission. The totals are cached from MissionCalculator by
# MissionPlans::Save so lists can show them without recalculating.
class CreateMissionPlans < ActiveRecord::Migration[8.1]
  def change
    create_table :mission_plans do |t|
      t.string :name, null: false
      t.string :customer_name
      t.references :spacecraft, null: false, foreign_key: true
      t.integer :passenger_count, null: false, default: 0
      t.text :notes
      t.float :total_distance_km
      t.float :range_used_km
      t.float :duration_hours
      t.boolean :feasible

      t.timestamps
    end
  end
end
