require 'json'

# ApplicationWindow class
class ApplicationWindow < Gtk::ApplicationWindow
  type_register

  class << self
    def init
      set_template resource: '/com/gyozaguy/socket-chat/../ui/application_window.ui'

      bind_template_child 'scroll_box'
      bind_template_child 'chat_view'
      bind_template_child 'message_entry'
      bind_template_child 'send_button'
      bind_template_child 'name_entry'
    end
  end

  def initialize(application, socket)
    super application: application

    set_title 'Socket Chat'
    @socket = socket

    @socket.on :message do |message|
      `notify-send "New message!" "#{message}"` unless active?
      chat_view.buffer.text += "#{message}\n"

      page_size = scroll_box.vadjustment.page_size
      upper = scroll_box.vadjustment.upper
      scroll_box.vadjustment.value = upper - page_size
    rescue StandardError => e
      warn e
    end

    setup_ui
  end

  def send_message(username, message)
    return if username.empty? || message.empty?

    @socket.send(JSON.generate({ data: "#{username}: #{message}", type: :message }))
    message_entry.text = ''
  end

  def setup_ui
    message_entry.signal_connect 'activate' do
      send_message(name_entry.text, message_entry.text)
    end

    send_button.signal_connect 'clicked' do
      send_message(name_entry.text, message_entry.text)
    end

    name_entry.signal_connect 'changed' do
      send_button.sensitive = !name_entry.text.empty?
    end

    message_entry.grab_focus
  end
end
