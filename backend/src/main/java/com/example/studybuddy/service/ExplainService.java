package com.example.studybuddy.service;

import com.example.studybuddy.dto.Response;
import com.example.studybuddy.dto.StreamChunk;
import com.example.studybuddy.dto.TokenUsage;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

/**
 * Explains a topic at a chosen level. Shows three ways of receiving a model's answer:
 *   1. explain()          -> waits for the whole answer, returns a String      (.call().content())
 *   2. explainWithUsage() -> whole answer + token counts                       (.call().chatResponse())
 *   3. explainStream()    -> answer arrives piece by piece as it is generated  (.stream().content())
 *
 * It uses a PROMPT TEMPLATE stored in a file, so the prompt text can be edited without touching Java.
 */
@Service
public class ExplainService {

    private static final int MAX_POINTS = 4;

    private final ChatClient client;

    // Loads src/main/resources/prompts/explain.st. The {topic}, {level}, {maxPoints}
    // placeholders inside it are filled in below with .param(...).
    @Value("classpath:/prompts/explain.st")
    private Resource explainTemplate;

    // The utility client has no memory: every explanation is independent.
    public ExplainService(@Qualifier("utilityClient") ChatClient client) {
        this.client = client;
    }

    /** 1) Simple: wait for the complete answer and return the text. */
    public Response explain(String topic, String level) {
        ChatResponse response = client.prompt()
                .user(u -> u.text(explainTemplate)
                        .param("topic", topic)
                        .param("level", level)
                        .param("maxPoints", MAX_POINTS))
                .call()
                .chatResponse();
        String answer = response.getResult().getOutput().getText();
        return new Response(answer, TokenUsage.from(response));
    }


    /**
     * 3) Streaming: returns a Flux, a "stream of values over time". Each element is a small piece
     * of the answer. The user sees text appear immediately instead of waiting for the full reply.
     * This is why the pom needs spring-boot-starter-webflux.
     */
    public Flux<StreamChunk> explainStream(String topic, String level) {
        return client.prompt()
                .user(u -> u.text(explainTemplate)
                        .param("topic", topic)
                        .param("level", level)
                        .param("maxPoints", MAX_POINTS))
                .stream()
                .content()
                // Wrap each text piece in a record so it is sent as JSON (see StreamChunk).
                .map(StreamChunk::new);
    }
}
