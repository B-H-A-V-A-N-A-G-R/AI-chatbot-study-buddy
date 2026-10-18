package com.example.studybuddy.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/**
 * Turns exceptions into a clean JSON error (RFC 7807 "ProblemDetail") the React app can show.
 *
 * Handlers are matched from most specific to least specific exception type, so the catch-all
 * Exception handler at the bottom only gets what the others didn't.
 *
 * Typical failures when working with LLMs:
 *   - ANTHROPIC_API_KEY missing or wrong                 -> 401 from Anthropic
 *   - no credits on the Anthropic account / rate limit   -> 400 / 429 from Anthropic
 *   - the model name in application.yml is wrong         -> 404 from Anthropic
 *   - the model returned malformed JSON for entity()     -> conversion errors
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    /** Our own validation errors (empty message, bad count, unusable quiz) keep the status we chose. */
    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail status(ResponseStatusException e) {
        return ProblemDetail.forStatusAndDetail(e.getStatusCode(), e.getReason());
    }

    /** Example: a memory advisor was called without a conversation id. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail badRequest(IllegalArgumentException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    /** Anything else is treated as "the AI model call failed". */
    @ExceptionHandler(Exception.class)
    public ProblemDetail modelProblem(Exception e) {
        // The full stack trace goes to the server log.
        log.error("AI call failed", e);

        // While you are learning, also show the provider's own error message in the UI.
        // Anthropic explains the real reason there, for example "credit balance is too low"
        // or "model: not found", which is far more useful than the exception name alone.
        // (For a production app, remove this and return only the generic hint.)
        String reason = e.getMessage() == null ? "no message" : e.getMessage();
        if (reason.length() > 400) {
            reason = reason.substring(0, 400) + "...";
        }
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY,
                "The AI model call failed. Is ANTHROPIC_API_KEY set, does the account have credits, and is the model name correct? ("
                        + e.getClass().getSimpleName() + ": " + reason + ")");
    }
}
