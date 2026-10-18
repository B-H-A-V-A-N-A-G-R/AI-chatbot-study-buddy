package com.example.studybuddy.dto;

import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatResponse;

/**
 * How many tokens one model call used.
 *
 * Hosted models bill per token, so it is worth showing this. Watch what happens in the Tutor chat:
 * promptTokens GROWS with every message, because the whole chat history is re-sent each time
 * (LLMs are stateless). That growth is the cost of memory.
 */
public record TokenUsage(long promptTokens, long completionTokens, long totalTokens) {

    /** Reads the usage numbers out of a ChatResponse (the "full envelope" from chatResponse()). */
    public static TokenUsage from(ChatResponse response) {
        if (response == null || response.getMetadata() == null || response.getMetadata().getUsage() == null) {
            // Some providers don't report usage. Return zeros instead of crashing.
            return new TokenUsage(0, 0, 0);
        }
        Usage usage = response.getMetadata().getUsage();
        return new TokenUsage(
                toLong(usage.getPromptTokens()),
                toLong(usage.getCompletionTokens()),
                toLong(usage.getTotalTokens()));
    }

    // Number (not Integer) so this compiles whether a version returns Integer or Long.
    private static long toLong(Number n) {
        return n == null ? 0 : n.longValue();
    }
}
