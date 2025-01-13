
from openai import OpenAI
import configparser
import pyodbc
import pandas as pd
from flask import Response

# Read configurations
#config = configparser.ConfigParser()
#config.read('appconfig.ini')

def generate_tsql_from_text(command):
    # Read OpenAI API key
    #api_key = config.get('openai', 'api_key', fallback='')
    api_key = "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"
    client = OpenAI(
        api_key=api_key,
    )

    prompt = f"""
    Convert the following natural language command into a T-SQL query:
    Command: "{command}"

    ServiceRecords Table Schema:
    - Date (DATE)
    - Job# (INT)
    - CustomerName (NVARCHAR(100))
    - VehicleType (NVARCHAR(50))
    - Parts (FLOAT)
    - Labor (FLOAT)
    - BillableHours (FLOAT)
    - TechnicianName (NVARCHAR(100))
    - CustomerSatisfactionRating (INT)

    Constraints:
    1. Ensure all columns in the SELECT clause are either aggregated using functions like SUM, AVG, etc., or included in the GROUP BY clause.
    2. Avoid integer division; use `1.0` for decimal calculations when dividing.
    3. Use window functions (e.g., `SUM(...) OVER()`) only in a valid manner that adheres to SQL Server syntax.
    4. Test the query logic to ensure it calculates percentages correctly.
    5. The query should only contain valid SQL Server syntax.

    If the command is not relevant to the ServiceRecords schema or cannot logically be converted into a T-SQL query, respond with:
    Error: Failed to generate TSQL, the command is not relevant to the ServiceRecords schema or cannot be converted into a query.

    Output:
    Provide only the T-SQL query without any markdown-style delimiters like ```sql or ```.

    Example:
    If asked for a pie chart of total revenue by vehicle type, generate a query like:
    SELECT 
        VehicleType,
        SUM(Parts + Labor) * 1.0 / SUM(SUM(Parts + Labor)) OVER() * 100 AS PercentageOfTotalRevenue
    FROM 
        ServiceRecords
    WHERE 
        Date >= DATEADD(MONTH, -3, GETDATE())
    GROUP BY 
        VehicleType;
    """

    try:
        # Use the ChatCompletion API for T-SQL query generation
        response_obj = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates T-SQL queries."},
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )

        tsql_query = response_obj.choices[0].message.content.strip()

        # Check for error message or validate the response
        if tsql_query.startswith("Error:"):
            print(tsql_query)  # Handle error appropriately
            html_response = f"""
                <html>
                    <body>
                        <strong>Error in Query Generation</strong>
                        <p><strong>Command:</strong> {command}</p>
                        <p>{tsql_query}</p>
                    </body>
                </html>
            """
            return None, None, Response(html_response, mimetype='text/html')
        else:
            print("Generated Query:", tsql_query)

        #prompt to get chart type
        prompt = f"""
        Analyze the following natural language command and determine the most suitable chart type to visualize the data:
        Command: {command}
        Provide only precise values like 'Pie', 'Bar', 'Line', or 'Table' rather than long paragraph, also dont postfix value with word chart
        """
        response_obj = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that suggests chart types for data visualization."},
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )

        chart_type = response_obj.choices[0].message.content.strip()
        
        return tsql_query, chart_type, None

    except Exception as e:
        print(f"An error occurred: {e}")
        return None, None, e # result, error

if __name__ == "__main__":
    # Prompt user for input
    natural_language_command = input("Enter your command: ")
    print("Generating T-SQL query...")
    
    # Generate T-SQL query
    tsql_query, chart_type = generate_tsql_from_text(natural_language_command)
    if tsql_query:
        print("\nGenerated T-SQL Query:\n")
        print(tsql_query)
        print("\nChart Type Recommended:\n")
        print(chart_type)

    #connect to azure SQL DB
    #connection_string = config.get('database', 'connection_string', fallback='')
    connection_string = "DRIVER={ODBC Driver 17 for SQL Server};SERVER=tcp:voicetobidbserver.database.windows.net,1433;DATABASE=voicetobidb;UID=santosh;PWD=MyPass9#1"
    conn = pyodbc.connect(connection_string)
    data = pd.read_sql_query(tsql_query, conn)
    conn.close()
    print(data)
