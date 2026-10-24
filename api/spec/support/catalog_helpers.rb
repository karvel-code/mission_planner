# Seeds the real catalog (data/data.yml) and finds its records, for specs that
# need real planets and spacecraft in the database.
module CatalogHelpers
  def seed_catalog = Catalog::Seeder.call(Catalog::Loader.call(Rails.root.join("../data/data.yml")))

  # catalog_planet(:earth), catalog_spacecraft(:nyx_odyssey)
  def catalog_planet(key) = Planet.find_by!(slug: key.to_s.dasherize)
  def catalog_spacecraft(key) = Spacecraft.find_by!(slug: key.to_s.dasherize)

  def catalog_route(*keys) = keys.map { |key| catalog_planet(key) }
end

RSpec.configure do |config|
  config.include CatalogHelpers
end
