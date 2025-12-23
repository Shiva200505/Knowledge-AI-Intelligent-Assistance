"""
Context-aware suggestion engine for analyzing case data and generating intelligent queries
"""
import re
import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import json

from models.schemas import CaseContext, SuggestionResponse
from config.settings import settings

logger = logging.getLogger(__name__)

class ContextEngine:
    """Engine for extracting context features and generating intelligent suggestions"""
    
    def __init__(self):
        self.case_type_patterns = {
            'flood': ['flood', 'water damage', 'hurricane', 'storm damage', 'flooding'],
            'auto': ['auto', 'car', 'vehicle', 'collision', 'accident', 'automotive'],
            'property': ['property', 'home', 'house', 'dwelling', 'homeowner'],
            'liability': ['liability', 'personal injury', 'bodily injury', 'property damage'],
            'workers_comp': ['workers compensation', 'work injury', 'workplace', 'employee'],
            'health': ['health', 'medical', 'healthcare', 'treatment', 'hospital'],
            'life': ['life insurance', 'death benefit', 'beneficiary', 'mortality'],
            'disability': ['disability', 'impairment', 'unable to work', 'incapacitated']
        }
        
        self.state_specific_terms = {
            'florida': ['florida statute', 'fl law', 'hurricane coverage', 'windstorm'],
            'california': ['california code', 'ca regulation', 'earthquake', 'wildfire'],
            'texas': ['texas law', 'tx statute', 'hail damage', 'tornado'],
            'new_york': ['new york law', 'ny regulation', 'no-fault', 'pip coverage'],
            'illinois': ['illinois law', 'il statute', 'comparative fault']
        }
        
        self.priority_weights = {
            'high': 1.5,
            'urgent': 2.0,
            'critical': 2.5,
            'medium': 1.0,
            'low': 0.8
        }
        
    async def extract_features(self, context: CaseContext) -> Dict[str, Any]:
        """Extract meaningful features from case context"""
        try:
            features = {
                'case_id': context.case_id,
                'primary_keywords': [],
                'secondary_keywords': [],
                'regulatory_context': [],
                'urgency_score': 1.0,
                'complexity_indicators': [],
                'document_categories': [],
                'search_focus': []
            }
            
            # Extract case type features
            case_type_features = await self._extract_case_type_features(context.case_type)
            features['primary_keywords'].extend(case_type_features['keywords'])
            features['document_categories'].extend(case_type_features['categories'])
            
            # Extract geographic/regulatory context
            if context.state:
                geo_features = await self._extract_geographic_features(context.state)
                features['regulatory_context'].extend(geo_features['regulations'])
                features['secondary_keywords'].extend(geo_features['keywords'])
                
            # Calculate urgency and complexity
            features['urgency_score'] = await self._calculate_urgency_score(context)
            features['complexity_indicators'] = await self._identify_complexity_indicators(context)
            
            # Extract temporal context
            temporal_features = await self._extract_temporal_features(context)
            features.update(temporal_features)
            
            # Extract financial context
            if context.claim_amount:
                financial_features = await self._extract_financial_features(context.claim_amount)
                features.update(financial_features)
                
            # Process custom fields
            if context.custom_fields:
                custom_features = await self._extract_custom_features(context.custom_fields)
                features['secondary_keywords'].extend(custom_features.get('keywords', []))
                
            # Determine search focus areas
            features['search_focus'] = await self._determine_search_focus(context, features)
            
            logger.info(f"Extracted features for case {context.case_id}: {len(features['primary_keywords'])} primary keywords")
            return features
            
        except Exception as e:
            logger.error(f"Feature extraction failed for case {context.case_id}: {e}")
            raise
            
    async def _extract_case_type_features(self, case_type: str) -> Dict[str, List[str]]:
        """Extract keywords and categories from case type"""
        case_type_lower = case_type.lower()
        keywords = [case_type.lower()]
        categories = ['general']
        
        # Match against known patterns
        for category, patterns in self.case_type_patterns.items():
            for pattern in patterns:
                if pattern in case_type_lower:
                    keywords.extend(patterns)
                    categories.append(category)
                    break
                    
        # Extract compound terms
        compound_keywords = await self._extract_compound_keywords(case_type)
        keywords.extend(compound_keywords)
        
        return {
            'keywords': list(set(keywords)),
            'categories': list(set(categories))
        }
        
    async def _extract_geographic_features(self, state: str) -> Dict[str, List[str]]:
        """Extract state-specific regulatory and keyword context"""
        state_lower = state.lower().replace(' ', '_')
        
        regulations = [f"{state} law", f"{state} regulation", f"{state} statute"]
        keywords = [state.lower()]
        
        # Add state-specific terms
        if state_lower in self.state_specific_terms:
            keywords.extend(self.state_specific_terms[state_lower])
            
        # Add common regulatory terms
        keywords.extend([
            'insurance code', 'regulatory compliance', 'state requirements',
            'filing requirements', 'coverage mandates'
        ])
        
        return {
            'regulations': regulations,
            'keywords': keywords
        }
        
    async def _calculate_urgency_score(self, context: CaseContext) -> float:
        """Calculate urgency score based on context factors"""
        base_score = 1.0
        
        # Priority-based scoring
        if context.priority:
            priority_weight = self.priority_weights.get(context.priority.lower(), 1.0)
            base_score *= priority_weight
            
        # Time-based scoring
        if context.date_created:
            days_old = (datetime.now() - context.date_created).days
            if days_old > 30:
                base_score *= 1.3  # Older cases get higher priority
            elif days_old > 14:
                base_score *= 1.2
                
        # Amount-based scoring
        if context.claim_amount:
            if context.claim_amount > 100000:
                base_score *= 1.4
            elif context.claim_amount > 50000:
                base_score *= 1.2
                
        # Status-based scoring
        status_urgency = {
            'pending review': 1.3,
            'investigation': 1.5,
            'dispute': 1.8,
            'legal review': 2.0,
            'appeal': 1.9
        }
        
        if context.status:
            status_weight = status_urgency.get(context.status.lower(), 1.0)
            base_score *= status_weight
            
        return min(base_score, 3.0)  # Cap at 3.0
        
    async def _identify_complexity_indicators(self, context: CaseContext) -> List[str]:
        """Identify factors that indicate case complexity"""
        indicators = []
        
        # Check case type complexity
        complex_case_types = ['liability', 'workers compensation', 'legal review']
        if any(term in context.case_type.lower() for term in complex_case_types):
            indicators.append('complex_case_type')
            
        # Check for multiple parties or policies
        if context.customer_type and 'multiple' in context.customer_type.lower():
            indicators.append('multiple_parties')
            
        # High-value claims
        if context.claim_amount and context.claim_amount > 75000:
            indicators.append('high_value')
            
        # Legal involvement
        if context.status and any(term in context.status.lower() for term in ['legal', 'dispute', 'appeal']):
            indicators.append('legal_involvement')
            
        # Regulatory complexity
        regulated_states = ['california', 'new york', 'florida', 'texas']
        if context.state and context.state.lower() in regulated_states:
            indicators.append('regulatory_complexity')
            
        return indicators
        
    async def _extract_temporal_features(self, context: CaseContext) -> Dict[str, Any]:
        """Extract time-based features"""
        features = {}
        
        if context.date_created:
            now = datetime.now()
            days_old = (now - context.date_created).days
            
            features['case_age_days'] = days_old
            features['case_age_category'] = self._categorize_age(days_old)
            features['temporal_keywords'] = self._get_temporal_keywords(days_old)
            
        return features
        
    def _categorize_age(self, days: int) -> str:
        """Categorize case age"""
        if days <= 7:
            return 'new'
        elif days <= 30:
            return 'recent'
        elif days <= 90:
            return 'mature'
        else:
            return 'aged'
            
    def _get_temporal_keywords(self, days: int) -> List[str]:
        """Get keywords based on case age"""
        if days <= 7:
            return ['new claim', 'initial review', 'first notice']
        elif days <= 30:
            return ['investigation', 'documentation', 'evidence']
        elif days <= 90:
            return ['settlement', 'negotiation', 'resolution']
        else:
            return ['closure', 'appeal', 'final review', 'compliance']
            
    async def _extract_financial_features(self, amount: float) -> Dict[str, Any]:
        """Extract features based on claim amount"""
        features = {
            'claim_amount': amount,
            'amount_category': self._categorize_amount(amount),
            'financial_keywords': self._get_financial_keywords(amount)
        }
        
        return features
        
    def _categorize_amount(self, amount: float) -> str:
        """Categorize claim amount"""
        if amount < 5000:
            return 'small'
        elif amount < 25000:
            return 'medium'
        elif amount < 100000:
            return 'large'
        else:
            return 'major'
            
    def _get_financial_keywords(self, amount: float) -> List[str]:
        """Get keywords based on claim amount"""
        keywords = ['claim amount', 'coverage', 'deductible']
        
        if amount < 5000:
            keywords.extend(['small claim', 'quick settlement'])
        elif amount < 25000:
            keywords.extend(['standard processing', 'documentation'])
        elif amount < 100000:
            keywords.extend(['large loss', 'investigation', 'approval required'])
        else:
            keywords.extend(['major loss', 'special handling', 'executive approval'])
            
        return keywords
        
    async def _extract_custom_features(self, custom_fields: Dict[str, Any]) -> Dict[str, Any]:
        """Extract features from custom fields"""
        features = {'keywords': []}
        
        for key, value in custom_fields.items():
            if isinstance(value, str):
                # Extract meaningful terms from string values
                words = re.findall(r'\b\w+\b', value.lower())
                features['keywords'].extend([word for word in words if len(word) > 3])
            elif key in ['priority', 'category', 'type']:
                # Add important categorical values
                features['keywords'].append(str(value).lower())
                
        return features
        
    async def _determine_search_focus(
        self, 
        context: CaseContext, 
        features: Dict[str, Any]
    ) -> List[str]:
        """Determine primary areas to focus search on"""
        focus_areas = []
        
        # Based on urgency
        if features['urgency_score'] > 1.5:
            focus_areas.append('urgent_procedures')
            
        # Based on complexity
        if len(features['complexity_indicators']) > 2:
            focus_areas.append('complex_cases')
            
        # Based on case type
        case_type_lower = context.case_type.lower()
        if 'flood' in case_type_lower:
            focus_areas.extend(['weather_related', 'property_damage'])
        elif 'auto' in case_type_lower:
            focus_areas.extend(['vehicle_claims', 'accident_procedures'])
        elif 'liability' in case_type_lower:
            focus_areas.extend(['liability_coverage', 'legal_requirements'])
            
        # Based on state
        if context.state:
            focus_areas.append('state_specific_requirements')
            
        return focus_areas
        
    async def _extract_compound_keywords(self, text: str) -> List[str]:
        """Extract compound keywords from text"""
        # Split on common delimiters
        parts = re.split(r'[,;\-_\s]+', text.lower())
        
        # Create compound terms
        compounds = []
        for i in range(len(parts) - 1):
            if len(parts[i]) > 2 and len(parts[i + 1]) > 2:
                compounds.append(f"{parts[i]} {parts[i + 1]}")
                
        return compounds
        
    async def generate_queries(self, features: Dict[str, Any]) -> List[str]:
        """Generate search queries based on extracted features"""
        queries = []
        
        try:
            # Primary query from main keywords
            if features['primary_keywords']:
                primary_query = ' '.join(features['primary_keywords'][:3])
                queries.append(primary_query)
                
            # Regulatory-focused queries
            if features['regulatory_context']:
                for regulation in features['regulatory_context'][:2]:
                    reg_query = f"{regulation} {' '.join(features['primary_keywords'][:2])}"
                    queries.append(reg_query)
                    
            # Focus-area specific queries
            for focus_area in features.get('search_focus', [])[:3]:
                focus_keywords = features['primary_keywords'][:2]
                focus_query = f"{focus_area} {' '.join(focus_keywords)}"
                queries.append(focus_query)
                
            # Complexity-based queries
            if features.get('complexity_indicators'):
                complex_query = f"complex cases {' '.join(features['primary_keywords'][:2])}"
                queries.append(complex_query)
                
            # Temporal queries for aged cases
            if features.get('case_age_category') == 'aged':
                temporal_query = f"case closure procedures {' '.join(features['primary_keywords'][:2])}"
                queries.append(temporal_query)
                
            # Financial threshold queries
            if features.get('amount_category') in ['large', 'major']:
                financial_query = f"high value claims {' '.join(features['primary_keywords'][:2])}"
                queries.append(financial_query)
                
            # Remove duplicates and empty queries
            queries = list(set([q.strip() for q in queries if q.strip()]))
            
            logger.info(f"Generated {len(queries)} queries from features")
            return queries[:8]  # Limit to 8 queries
            
        except Exception as e:
            logger.error(f"Query generation failed: {e}")
            # Fallback to basic query
            if features['primary_keywords']:
                return [' '.join(features['primary_keywords'][:3])]
            return ['insurance policy procedures']
            
    async def rank_suggestions(
        self,
        suggestions: List[SuggestionResponse],
        features: Dict[str, Any]
    ) -> List[SuggestionResponse]:
        """Rank suggestions based on context relevance"""
        try:
            scored_suggestions = []
            
            for suggestion in suggestions:
                score = await self._calculate_suggestion_score(suggestion, features)
                suggestion.relevance_score = score
                scored_suggestions.append(suggestion)
                
            # Sort by score (descending)
            scored_suggestions.sort(key=lambda x: x.relevance_score, reverse=True)
            
            # Remove duplicates based on content similarity
            deduplicated = await self._deduplicate_suggestions(scored_suggestions)
            
            logger.info(f"Ranked {len(suggestions)} suggestions, returning {len(deduplicated)}")
            return deduplicated
            
        except Exception as e:
            logger.error(f"Suggestion ranking failed: {e}")
            return suggestions
            
    async def _calculate_suggestion_score(
        self,
        suggestion: SuggestionResponse,
        features: Dict[str, Any]
    ) -> float:
        """Calculate relevance score for a suggestion"""
        base_score = suggestion.relevance_score
        
        # Keyword matching bonus
        content_lower = suggestion.content.lower()
        keyword_matches = sum(
            1 for keyword in features['primary_keywords']
            if keyword.lower() in content_lower
        )
        
        if features['primary_keywords']:
            keyword_score = keyword_matches / len(features['primary_keywords'])
            base_score += keyword_score * 0.3
            
        # Urgency bonus
        urgency_multiplier = min(features.get('urgency_score', 1.0) / 2.0, 0.3)
        base_score += urgency_multiplier
        
        # Regulatory context bonus
        if features['regulatory_context']:
            reg_matches = sum(
                1 for reg in features['regulatory_context']
                if any(term in content_lower for term in reg.lower().split())
            )
            if reg_matches > 0:
                base_score += 0.2
                
        # Complexity indicator bonus
        if features.get('complexity_indicators'):
            complexity_terms = ['complex', 'investigation', 'legal', 'appeal', 'dispute']
            if any(term in content_lower for term in complexity_terms):
                base_score += 0.15
                
        # Recency bonus for newer documents
        if hasattr(suggestion, 'timestamp'):
            # Prefer more recent suggestions
            days_old = (datetime.now() - suggestion.timestamp).days
            if days_old < 30:
                base_score += 0.1
                
        return min(base_score, 1.0)  # Cap at 1.0
        
    async def _deduplicate_suggestions(
        self,
        suggestions: List[SuggestionResponse]
    ) -> List[SuggestionResponse]:
        """Remove duplicate or very similar suggestions"""
        if not suggestions:
            return suggestions
            
        deduplicated = [suggestions[0]]  # Always keep the highest scored
        
        for suggestion in suggestions[1:]:
            is_duplicate = False
            
            for existing in deduplicated:
                # Check for content similarity
                if await self._are_similar_suggestions(suggestion, existing):
                    is_duplicate = True
                    break
                    
            if not is_duplicate:
                deduplicated.append(suggestion)
                
        return deduplicated
        
    async def _are_similar_suggestions(
        self,
        suggestion1: SuggestionResponse,
        suggestion2: SuggestionResponse
    ) -> bool:
        """Check if two suggestions are too similar"""
        # Same document and page
        if (suggestion1.source_document == suggestion2.source_document and
            suggestion1.page_number == suggestion2.page_number):
            return True
            
        # Similar content (simple word overlap check)
        words1 = set(suggestion1.content.lower().split())
        words2 = set(suggestion2.content.lower().split())
        
        if len(words1) > 0 and len(words2) > 0:
            overlap = len(words1.intersection(words2))
            similarity = overlap / max(len(words1), len(words2))
            
            if similarity > 0.8:  # 80% word overlap threshold
                return True
                
        return False