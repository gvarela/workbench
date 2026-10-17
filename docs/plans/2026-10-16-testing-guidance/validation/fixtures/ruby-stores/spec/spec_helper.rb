# frozen_string_literal: true

require "factory_bot"
require_relative "../app/resolvers/store_resolver"

RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods

  config.before(:suite) do
    FactoryBot.find_definitions
  end
end
