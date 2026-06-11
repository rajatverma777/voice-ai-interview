import sys
import os
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

from models.schemas import InterviewMode, Message
from services.feedback_service import analyze_response

async def test_fallback():
    print("--- Test 1: Fallback (No keys) ---")
    res = await analyze_response(
        user_message="I think binary search is log n but maybe it does not require sorted input",
        ai_response="That's not correct. Think carefully about the input condition.",
        mode=InterviewMode.DSA,
        history=[]
    )
    print("Result:", res)
    assert res is not None
    assert "overall_score" in res
    assert "suggestions" in res
    print("Fallback test passed successfully!\n")

async def test_openai_mock():
    print("--- Test 2: Mocked OpenAI Feedback ---")
    mock_settings = MagicMock()
    mock_settings.ai_provider = "openai"
    mock_settings.openai_api_key = "fake_openai_key"
    mock_settings.gemini_api_key = ""
    
    mock_chat_completion = MagicMock()
    mock_chat_completion.choices = [
        MagicMock(message=MagicMock(content='''{
            "technical_accuracy": 92.0,
            "communication_clarity": 88.0,
            "confidence_level": 85.0,
            "overall_score": 89.0,
            "suggestions": ["Elaborate on binary search boundary checks.", "Avoid saying 'maybe'."]
        }'''))
    ]
    
    # Mock AsyncOpenAI client
    mock_client = MagicMock()
    mock_client.chat = MagicMock()
    mock_client.chat.completions = MagicMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_chat_completion)
    
    with patch("services.feedback_service.get_settings", return_value=mock_settings), \
         patch("openai.AsyncOpenAI", return_value=mock_client):
         
        res = await analyze_response(
            user_message="Binary search is log n time complexity.",
            ai_response="Correct, what is the space complexity?",
            mode=InterviewMode.DSA,
            history=[Message(role="assistant", content="What is the complexity of binary search?")]
        )
        print("Result:", res)
        assert res["technical_accuracy"] == 92.0
        assert "Avoid saying 'maybe'." in res["suggestions"]
        print("Mocked OpenAI test passed successfully!\n")

async def test_gemini_mock():
    print("--- Test 3: Mocked Gemini Feedback ---")
    mock_settings = MagicMock()
    mock_settings.ai_provider = "gemini"
    mock_settings.gemini_api_key = "fake_gemini_key"
    mock_settings.openai_api_key = ""
    
    mock_gemini_model = MagicMock()
    mock_gemini_model.generate_content_async = AsyncMock(
        return_value=MagicMock(text='''{
            "technical_accuracy": 95.0,
            "communication_clarity": 90.0,
            "confidence_level": 90.0,
            "overall_score": 92.0,
            "suggestions": ["Great structural explanation of System Design."]
        }''')
    )
    
    with patch("services.feedback_service.get_settings", return_value=mock_settings), \
         patch("google.generativeai.GenerativeModel", return_value=mock_gemini_model), \
         patch("google.generativeai.configure") as mock_conf:
         
        res = await analyze_response(
            user_message="I would scale the database using sharding.",
            ai_response="Solid, how do you pick a shard key?",
            mode=InterviewMode.SYSTEM_DESIGN,
            history=[]
        )
        print("Result:", res)
        assert res["technical_accuracy"] == 95.0
        assert "Great structural explanation of System Design." in res["suggestions"]
        print("Mocked Gemini test passed successfully!\n")

async def test_failures():
    print("--- Test 4: Exception Fallback ---")
    mock_settings = MagicMock()
    mock_settings.ai_provider = "openai"
    mock_settings.openai_api_key = "fake_openai_key"
    mock_settings.gemini_api_key = ""
    
    # Mock AsyncOpenAI client to raise exception
    mock_client = MagicMock()
    mock_client.chat = MagicMock()
    mock_client.chat.completions = MagicMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=Exception("API limit exceeded"))
    
    with patch("services.feedback_service.get_settings", return_value=mock_settings), \
         patch("openai.AsyncOpenAI", return_value=mock_client):
         
        # This should catch the exception silently, print "OpenAI feedback failed: ..." and return heuristic response
        res = await analyze_response(
            user_message="I think binary search is log n but maybe it does not require sorted input",
            ai_response="That's not correct. Think carefully about the input condition.",
            mode=InterviewMode.DSA,
            history=[]
        )
        print("Result:", res)
        assert res is not None
        assert "overall_score" in res
        # Should contain heuristic result suggestions
        assert any("Try to sound more confident" in s for s in res["suggestions"])
        print("Exception fallback test passed successfully!\n")

async def main():
    await test_fallback()
    await test_openai_mock()
    await test_gemini_mock()
    await test_failures()

if __name__ == "__main__":
    asyncio.run(main())
