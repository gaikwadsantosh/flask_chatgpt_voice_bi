from flask import Flask, render_template
from api.routes import api_blueprint  # Import the blueprint
import time

app = Flask(__name__, static_folder='static', template_folder='templates')

# Register the blueprint
app.register_blueprint(api_blueprint, url_prefix='/api')

@app.route('/')
def serve_html():
    return render_template('index.html', time=time)

if __name__ == '__main__':
    app.run(debug=True)
