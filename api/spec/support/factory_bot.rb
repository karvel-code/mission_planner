# Lets specs call `create(:planet)` instead of `FactoryBot.create(:planet)`.
RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods
end
