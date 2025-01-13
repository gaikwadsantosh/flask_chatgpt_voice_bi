from flask import Blueprint, request
from .speech_to_text import speech_to_text
from . import api_blueprint
import configparser
import os
from .text_to_tsql import generate_tsql_from_text
import pyodbc
import pandas as pd
import numpy as np  
import jsonify

# Get the absolute path to appconfig.ini
#config_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'appconfig.ini')

# Read configurations
#config = configparser.ConfigParser()
#config.read(config_file_path)

@api_blueprint.route('/speech_to_text_api', methods=['POST'])
def speech_to_text_api():
    if 'audio' not in request.files:
        return {"error": "No audio file uploaded"}, 400

    audio_file = request.files['audio']  # Get the uploaded file
    print(f"Received file: {audio_file.filename}")  # Debugging log

    api_key = "6Xd5l4AzWXK1WdtdgokmNRofRYAWA5dV56VihMpH5RVFzgizuRxHJQQJ99BAACYeBjFXJ3w3AAAYACOGJQbO"
    region = "eastus"

    try:
        # Call the speech-to-text function
        recognized_text = speech_to_text(api_key, region, audio_file)
        if recognized_text:
            return {"text": recognized_text}, 200
        else:
            return {"error": "No speech recognized or recognition failed."}, 500
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return {"error": str(e)}, 500

@api_blueprint.route('/text_to_sql_api', methods=['POST'])
def text_to_sql_api():
    if not request.json or 'text_command' not in request.json:
        return {"error": "No text command provided"}, 400

    text_command = request.json['text_command']
    print(f"Received text command: {text_command}")

    try:
        # Generate T-SQL and chart type
        tsql_query, chart_type, errorMessage = generate_tsql_from_text(text_command)
        if errorMessage:
            return errorMessage, 400

        print(f"Generated T-SQL Query: {tsql_query}")
        print(f"Recommended Chart Type: {chart_type}")

        # Execute T-SQL query and fetch data
        #connection_string = config.get('database', 'connection_string', fallback='')
        connection_string = "DRIVER={ODBC Driver 17 for SQL Server};SERVER=tcp:voicetobidbserver.database.windows.net,1433;DATABASE=voicetobidb;UID=santosh;PWD=MyPass9#1"
        
        conn = pyodbc.connect(connection_string)
        data = pd.read_sql_query(tsql_query, conn)

        conn.close()

        print(data)

        #replace nulls which js can handle        
        data = data.replace({pd.NA: None, np.nan: None})

        # Round all float values to 2 decimal places
        for column in data.select_dtypes(include=['float']).columns:
            data[column] = data[column].round(2)


        first_row = data.iloc[0]
        if (first_row == 0).all() or (first_row.isnull()).all() or (first_row == "").all():
            print("\nFirst row is invalid (all zeros or empty). Returning empty DataFrame.")
            data = pd.DataFrame()  # Reset to an empty DataFrame

        # Handle empty DataFrame
        if data.empty:
            return {
                "tsql_query": tsql_query,
                "chart_type": chart_type,
                "data": []  # Explicitly return an empty list
            }, 200

        return {
            "tsql_query": tsql_query,
            "chart_type": chart_type,
            "data": data.to_dict(orient='records')  # Convert DataFrame to list of dictionaries
        }, 200

    except Exception as e:
        print(f"An error occurred: {e}")
        return {"error": str(e)}, 500