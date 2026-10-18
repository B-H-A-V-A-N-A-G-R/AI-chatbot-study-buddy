package com.example.studybuddy.controller;

import com.example.studybuddy.dto.Response;
import com.example.studybuddy.dto.Quiz;
import com.example.studybuddy.dto.StreamChunk;
import com.example.studybuddy.service.ExplainService;
import com.example.studybuddy.service.QuizService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;

/**
 * Endpoints for the one-shot features (no memory): explain a topic, and generate a quiz.
 *
 *   GET /api/study/explain?topic=..&level=..          plain text
 *   GET /api/study/explain/usage?topic=..&level=..    JSON: answer + token usage
 *   GET /api/study/explain/stream?topic=..&level=..   streamed, one JSON object per line
 *   GET /api/study/quiz?topic=..&count=..             JSON quiz built from Java records
 */
@RestController
@RequestMapping("/api/study")
public class StudyController {

    private final ExplainService explainService;
    private final QuizService quizService;

    public StudyController(ExplainService explainService, QuizService quizService) {
        this.explainService = explainService;
        this.quizService = quizService;
    }

    @GetMapping("/explain")
    public Response explain(@RequestParam String topic,
                            @RequestParam(defaultValue = "beginner") String level) {
        return explainService.explain(requireTopic(topic), level);
    }

    /**
     * Streaming endpoint. Returning a Flux makes Spring send elements as soon as they are ready.
     * NDJSON ("newline-delimited JSON") = one JSON object per line, flushed immediately.
     * The React app reads the response body piece by piece and appends each chunk to the screen.
     */
    @GetMapping(value = "/explain/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
    public Flux<StreamChunk> explainStream(@RequestParam String topic,
                                           @RequestParam(defaultValue = "beginner") String level) {
        return explainService.explainStream(requireTopic(topic), level);
    }

    @GetMapping("/quiz")
    public Quiz quiz(@RequestParam String topic,
                     @RequestParam(defaultValue = "3") int count) {
        // Limit the count: every extra question costs tokens and time.
        if (count < 1 || count > 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "count must be between 1 and 10.");
        }
        return quizService.generate(requireTopic(topic), count);
    }

    private String requireTopic(String topic) {
        if (topic == null || topic.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "topic must not be empty.");
        }
        if (topic.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "topic is too long (max 200 characters).");
        }
        return topic.trim();
    }
}
