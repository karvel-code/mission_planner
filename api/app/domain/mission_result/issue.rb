class MissionResult
  # A violation or advisory: a Symbol `code`, a message for the agent, and the
  # values behind it in `details` (e.g. the planet and the limit involved).
  # Issues about one stop carry its position in the route as `stop_index`.
  Issue = Data.define(:code, :message, :details)
end
