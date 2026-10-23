class MissionResult
  # One flight between two stops. `from` and `to` are MissionCalculator::Body
  # values; `bypassed` lists the bodies the trajectory goes around.
  Leg = Data.define(:from, :to, :trajectory, :bypassed, :range_used, :duration_h) do
    def length_km = trajectory.length
  end
end
