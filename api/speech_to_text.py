import azure.cognitiveservices.speech as speechsdk
from pydub import AudioSegment
import io

def speech_to_text(api_key, region, audio_stream):
    """
    Convert speech to text using Azure Speech Service with in-memory stream.
    """
    try:
        # Configure Speech SDK
        speech_config = speechsdk.SpeechConfig(subscription=api_key, region=region)

        # Convert the uploaded file to WAV with PCM 16-bit, 16 kHz mono
        audio_stream.seek(0)  # Reset stream position
        audio = AudioSegment.from_file(audio_stream, format="wav")
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)

        # Export the converted audio to an in-memory buffer
        wav_stream = io.BytesIO()
        audio.export(wav_stream, format="wav")
        wav_stream.seek(0)  # Reset stream position

        # Create a PushAudioInputStream
        push_stream = speechsdk.audio.PushAudioInputStream()

        # Write data from in-memory buffer to PushAudioInputStream
        while chunk := wav_stream.read(4096):  # Read in chunks of 4 KB
            push_stream.write(chunk)

        push_stream.close()  # Signal that all audio data has been pushed

        # Use the PushAudioInputStream with Azure Speech SDK
        audio_config = speechsdk.audio.AudioConfig(stream=push_stream)
        recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

        # Perform recognition
        result = recognizer.recognize_once()

        # Handle the result
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            return result.text
        elif result.reason == speechsdk.ResultReason.NoMatch:
            return None
        elif result.reason == speechsdk.ResultReason.Canceled:
            cancellation = result.cancellation_details
            if cancellation.reason == speechsdk.CancellationReason.Error:
                print(f"Error details: {cancellation.error_details}")
            return None
    except Exception as e:
        print(f"An error occurred: {e}")
        raise RuntimeError(f"Speech recognition failed: {str(e)}")
