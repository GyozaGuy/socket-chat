require_relative '../../../websocket_client'
require_relative './application_window'

# Application class
class Application < Gtk::Application
  def initialize
    super 'com.gyozaguy.socket-chat', Gio::ApplicationFlags::FLAGS_NONE

    signal_connect :activate do |application|
      socket = WebSocketClient.new('localhost', 2345)

      window = ApplicationWindow.new(application, socket)
      window.present
    end
  end
end
