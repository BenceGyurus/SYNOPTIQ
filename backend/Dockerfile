# Set the base image
FROM python:3.13-slim

# Set the working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.lock .
RUN pip install --no-cache-dir -r requirements.lock

# Copy the rest of the application code
COPY . .
RUN useradd --create-home --uid 10001 solaris && chown -R solaris:solaris /app

# Expose the port the app runs on
EXPOSE 8000

# Run the application
USER solaris
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
