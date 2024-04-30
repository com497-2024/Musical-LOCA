from flask import Flask, request, jsonify
from flask_cors import CORS

import pathlib
import textwrap

import google.generativeai as genai

app = Flask(__name__)
CORS(app)

from IPython.display import display
from IPython.display import Markdown


def to_markdown(text):
  text = text.replace('•', '  *')
  return Markdown(textwrap.indent(text, '> ', predicate=lambda _: True))
 
@app.route('/generate_lyrics', methods=['POST'])
def generate_lyrics():
    # Extract topic from the request
    topic = request.json['topic']

    # Prepend "Song idea about:" to the user input
    topic = "Song idea about: " + topic

    api_key = 'AIzaSyADwyY52rFN_1mbW-Ktbnh4GD4qGB27KhU'
    genai.configure(api_key=api_key)


    model_name = 'models/text-bison-001'
    model = genai.get_model(model_name)




    generation_config = {"temperature": 0.9, "top_p":1, "top_k": 1, "max_output_tokens":2048}
    safety_settings = None   
    stream = False          


    response = genai.generate_text(
        model=model,
        prompt=topic,
        temperature=generation_config["temperature"],
        top_p=generation_config["top_p"],
        top_k=generation_config["top_k"],
        max_output_tokens=generation_config["max_output_tokens"]
    )

    if response is not None:
        generated_lyrics = response.result
        return jsonify({'lyrics': generated_lyrics})

if __name__ == '__main__':
    app.run(debug=True)