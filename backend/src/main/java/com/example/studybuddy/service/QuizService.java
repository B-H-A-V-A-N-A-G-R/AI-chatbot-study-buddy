package com.example.studybuddy.service;

import com.example.studybuddy.dto.Quiz;
import com.example.studybuddy.dto.QuizQuestion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Generates a quiz as TYPED JAVA OBJECTS instead of free text.
 *
 * The trick is .entity(Quiz.class). Behind the scenes Spring AI:
 *   1. looks at the Quiz record and appends "reply only with JSON in this shape" to the prompt,
 *   2. lets the model answer with JSON,
 *   3. converts that JSON into Quiz / QuizQuestion objects (using Jackson, like in Spring MVC).
 */
@Service
public class QuizService {

    private final ChatClient client;

    public QuizService(@Qualifier("utilityClient") ChatClient client) {
        this.client = client;
    }

    private static final Logger log = LoggerFactory.getLogger(QuizService.class);

    /**
     * Models are not deterministic: now and then one answers with an empty or malformed reply,
     * even for a normal request. That is why we try twice before giving up.
     */
    public Quiz generate(String topic, int count) {
        RuntimeException last = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                Quiz quiz = callModel(topic, count);
                validate(quiz, count);
                return quiz;
            } catch (ResponseStatusException e) {
                last = e; // our own "unusable quiz" check failed: try again
            } catch (RuntimeException e) {
                // Includes Jackson errors such as "No content to map due to end-of-input" (empty reply).
                // A real API error (401 bad key, 400 bad request, 429 rate limit...) is NOT retried.
                if (e.getClass().getName().startsWith("com.anthropic.errors")) {
                    throw e;
                }
                last = e;
            }
            log.warn("Quiz attempt {} failed: {}", attempt, last.toString());
        }
        throw badModelOutput("The model did not return a usable quiz.");
    }

    private Quiz callModel(String topic, int count) {
        return client.prompt()
                .system("""
                        You create accurate multiple-choice quizzes for Java developers.
                        Every question has exactly 4 options.
                        correctIndex is the 0-based position of the right option.
                        The topic may contain spelling mistakes. Silently interpret what the user meant.
                        """)
                .user("Create a quiz of " + count + " questions about: " + topic)
                .call()
                // Reliability switch: if the JSON doesn't match the Quiz structure, Spring AI tells the
                // model what was wrong and retries. (Also available: useProviderStructuredOutput(),
                // which asks the provider's API to enforce the schema. Not every provider supports it.)
                .entity(Quiz.class, spec -> spec.validateSchema());
    }

    /**
     * Valid JSON does NOT mean a correct quiz. A model can return perfectly shaped JSON where
     * correctIndex points to an option that doesn't exist. Never trust LLM output blindly:
     * check it like you would check input from an outside user.
     */
    private void validate(Quiz quiz, int expectedCount) {
        if (quiz == null || quiz.questions() == null || quiz.questions().isEmpty()) {
            throw badModelOutput("The model returned no questions.");
        }
        for (QuizQuestion q : quiz.questions()) {
            if (q.options() == null || q.options().size() != 4) {
                throw badModelOutput("A question did not have exactly 4 options.");
            }
            if (q.correctIndex() < 0 || q.correctIndex() > 3) {
                throw badModelOutput("A question had an invalid correctIndex.");
            }
        }
    }

    // 502 Bad Gateway: our app is fine, the upstream model gave us something unusable.
    private ResponseStatusException badModelOutput(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                reason + " Try again, or use a stronger model.");
    }
}
