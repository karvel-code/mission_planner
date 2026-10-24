# One stop on a mission plan's route. Position 0 is the start. Positions are
# unique per plan (enforced by a database index), and MissionPlan#route=
# assigns them.
class MissionStop < ApplicationRecord
  belongs_to :mission_plan
  belongs_to :planet

  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
end
