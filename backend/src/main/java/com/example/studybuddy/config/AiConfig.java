package com.example.studybuddy.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.InMemoryChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Creates the building blocks of our AI features.
 *
 * We need TWO ChatClients because they behave differently:
 *   1. "tutorClient"   - has MEMORY (remembers the conversation). Needs a conversation id on every call.
 *   2. "utilityClient" - NO memory. Used for one-shot jobs (explain a topic, make a quiz).
 *                        History would only add noise and cost tokens there.
 *
 * Both are of the same Java type (ChatClient), so Spring can't tell them apart by type alone.
 * That is why every bean has a NAME and the places that use them add @Qualifier("<name>").
 */
@Configuration
public class AiConfig {

    /**
     * ChatMemory = "where old messages are kept".
     *
     * MessageWindowChatMemory keeps only the most recent N messages per conversation
     * (a sliding window). Older ones are dropped, so the prompt can't grow forever and
     * overflow the model's context window or run up the bill. System messages are always kept.
     *
     * The repository decides WHERE messages are stored. InMemoryChatMemoryRepository keeps them
     * in Java memory, so they are lost when the app restarts. To make memory persistent, swap this
     * for JdbcChatMemoryRepository (see the README, "Next steps"). Nothing else in the project changes.
     */
    @Bean
    public ChatMemory chatMemory() {
        return MessageWindowChatMemory.builder()
                .chatMemoryRepository(new InMemoryChatMemoryRepository())
                .maxMessages(20)
                .build();
    }

    /**
     * The tutor: friendly personality + memory.
     *
     * ChatClient.Builder is a PROTOTYPE bean: Spring hands every bean method its own fresh builder,
     * so configuring this one does not affect the utility client below.
     */
    @Bean("tutorClient")
    public ChatClient tutorClient(ChatClient.Builder builder, ChatMemory chatMemory) {
        return builder
                // The default system message is added to EVERY request made with this client.
                // This is where we control behaviour and personality.
                .defaultSystem(" You are a friendly Java and Spring tutor. Explain simply and use short examples. End each answer with one follow-up question to check understanding. If you are not sure about something, say so instead of guessing. ")
                // Advisors run in the order listed, like servlet filters around the model call.
                //   1) The memory advisor loads the old messages for this conversation id
                //      and adds them to the prompt (and saves the new messages afterwards).
                //   2) The logger goes LAST so it prints the final prompt, after memory was added.
                .defaultAdvisors(
                        MessageChatMemoryAdvisor.builder(chatMemory).build(),
                        new SimpleLoggerAdvisor())
                .build();
    }

    /** The utility client: no memory, just logging. Used for explanations and quizzes. */
    @Bean("utilityClient")
    public ChatClient utilityClient(ChatClient.Builder builder) {
        return builder
                .defaultAdvisors(new SimpleLoggerAdvisor())
                .build();
    }
}
