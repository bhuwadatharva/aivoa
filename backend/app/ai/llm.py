import json
import re
from datetime import date
from typing import Any, List, Optional, Dict, Union, Type
from pydantic import BaseModel
from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGeneration
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_groq import ChatGroq
from app.config import settings
from app.schemas import AIAgentOutputSchema

# Define a Mock LLM for local testing when GROQ_API_KEY is not set
class MockChatGroq(BaseChatModel):
    model_name: str = "gemma2-9b-it-mock"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        # Simple rule-based mock logic to respond conversationally
        user_msg = ""
        for msg in reversed(messages):
            if msg.type == "user":
                user_msg = msg.content
                break
        
        response_text = self._mock_chat_response(user_msg)
        generation = ChatGeneration(message=AIMessage(content=response_text))
        return ChatResult(generations=[generation])

    @property
    def _llm_type(self) -> str:
        return "mock-groq-chat"

    def with_structured_output(self, schema: Type[BaseModel], **kwargs: Any) -> Any:
        # Return a helper that behaves like the structured LLM
        return MockStructuredOutput(schema)

    def _mock_chat_response(self, text: str) -> str:
        text_lower = text.lower()
        if "prepare" in text_lower or "prep" in text_lower:
            return "Here is the briefing for your meeting: Dr. Shah is highly interested in oncology products, particularly Product X. Previous interactions show positive sentiment, but he has expressed concerns over local pricing. Recommended next action: Share trial brochure."
        elif "compliance" in text_lower:
            return "Compliance analysis complete: No major gift violations detected. Off-label drug discussions were not present in the log."
        elif "next" in text_lower or "action" in text_lower:
            return "Based on interaction history, the Next Best Action is: Schedule meeting in 2 weeks to present Clinical Trial Brochures for Product X. Dr. Shah is highly interested."
        elif "insight" in text_lower:
            return "HCP Insight Generated: Relationship score is 85/100. Product interest is high on Product X. Objections center around pricing structure."
        elif "competitor" in text_lower:
            return "Competitor Intelligence Report: Competitor 'PharmaCorp Y' was mentioned twice. The physician prefers their pricing structure but admits our product has superior efficacy."
        elif "follow" in text_lower:
            return "Smart Follow-up planned: Schedule calendar event on next Monday for email outreach."
        else:
            return f"Understood. I have parsed your interaction log. I've automatically extracted the key details for Dr. Shah and pre-filled the interaction form on the left. Let me know if you would like me to compile compliance reports, meeting preps, or update follow-up schedules."

class MockStructuredOutput:
    def __init__(self, schema: Type[BaseModel]):
        self.schema = schema

    def invoke(self, input_data: Any, *args: Any, **kwargs: Any) -> BaseModel:
        # Extract query text
        query = ""
        if isinstance(input_data, list):
            for m in reversed(input_data):
                if hasattr(m, 'content'):
                    query += " " + m.content
                elif isinstance(m, dict) and 'content' in m:
                    query += " " + m['content']
        elif isinstance(input_data, str):
            query = input_data
        elif hasattr(input_data, 'to_messages'):
            for m in input_data.to_messages():
                query += " " + m.content

        query_lower = query.lower()

        # Extract doctor name
        doc_match = re.search(r'(dr\.\s+[a-zA-Z]+|doctor\s+[a-zA-Z]+)', query_lower)
        doc_name = doc_match.group(0).title() if doc_match else "Dr. Shah"
        if "shah" in query_lower:
            doc_name = "Dr. Shah"
        elif "harrison" in query_lower:
            doc_name = "Dr. Harrison"
        elif "smith" in query_lower:
            doc_name = "Dr. Smith"

        # Products
        products = []
        if "product x" in query_lower or "product-x" in query_lower:
            products.append("Product X")
        if "cardivas" in query_lower or "cardivas-10" in query_lower:
            products.append("Cardivas-10")
        if "oncolyze" in query_lower or "oncolyze-b" in query_lower:
            products.append("Oncolyze-B")
        if not products:
            products = ["Product X"]

        # Competitors
        competitors = []
        if "pharmacorp" in query_lower:
            competitors.append("PharmaCorp Y")
        if "comp y" in query_lower or "competitor y" in query_lower:
            competitors.append("Competitor Y")
        if "pfizer" in query_lower or "novartis" in query_lower:
            competitors.append("Novartis")

        # Sentiment
        sentiment = "Neutral"
        if any(w in query_lower for w in ["interested", "good", "great", "positive", "happy", "excited"]):
            sentiment = "Positive"
        elif any(w in query_lower for w in ["unhappy", "angry", "bad", "negative", "refused", "objected"]):
            sentiment = "Negative"

        # Materials
        materials = []
        if "brochure" in query_lower or "brochures" in query_lower:
            materials.append("Product Brochure")
        if "paper" in query_lower or "trial" in query_lower or "clinical" in query_lower:
            materials.append("Clinical Trial Paper")
        if "slides" in query_lower:
            materials.append("Presentation Slides")

        # Follow-up
        follow_up = "In 1 week"
        if "two weeks" in query_lower or "2 weeks" in query_lower:
            follow_up = "In 2 weeks"
        elif "next month" in query_lower:
            follow_up = "In 1 month"
        elif "tomorrow" in query_lower:
            follow_up = "Tomorrow"

        summary = f"Met {doc_name} to present {', '.join(products)}. "
        if sentiment == "Positive":
            summary += "The doctor expressed high interest and was receptive to prescribing."
        elif sentiment == "Negative":
            summary += "The doctor raised objections regarding product pricing and accessibility."
        else:
            summary += "Discussed therapeutic advantages and left promotional materials."

        from app.schemas import DoctorOutput, HospitalOutput, InteractionOutput, DoctorResolverSchema, EditInteractionInstructions

        if self.schema == AIAgentOutputSchema:
            # Build structured mock output
            doctor = DoctorOutput(id="1", name=doc_name, created=False)
            hospital = HospitalOutput(id="2", name="Metro Health Center", created=False)
            interaction = InteractionOutput(
                interaction_type="Meeting",
                topics=products,
                materials=materials,
                samples=3 if "sample" in query_lower else 0,
                sentiment=sentiment,
                follow_up=follow_up,
                summary=summary,
                notes=query.strip()
            )
            return AIAgentOutputSchema(
                doctor=doctor,
                hospital=hospital,
                interaction=interaction
            )
            
        if self.schema == DoctorResolverSchema:
            return DoctorResolverSchema(
                doctor_name=doc_name,
                hospital_name="Aparant Hospital" if "aparant" in query_lower else "Metro Health Center",
                department="Cardiology" if "cardiocare" in query_lower or "cardiology" in query_lower else "General Medicine"
            )

        if self.schema == EditInteractionInstructions:
            return EditInteractionInstructions(
                sentiment="Neutral" if "neutral" in query_lower else ("Positive" if "positive" in query_lower else None),
                materials_to_remove=["Product Brochure"] if "remove brochure" in query_lower else []
            )
        
        # Fallback for other schemas
        try:
            return self.schema()
        except Exception:
            return None

def get_llm(model_name: str = "llama-3.3-70b-versatile"):
    """
    Returns ChatGroq if GROQ_API_KEY is configured, else falls back to MockChatGroq.
    """
    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
        return ChatGroq(
            groq_api_key=settings.GROQ_API_KEY,
            model_name=model_name,
            temperature=0.1
        )
    else:
        return MockChatGroq(model_name=f"{model_name}-mock")
