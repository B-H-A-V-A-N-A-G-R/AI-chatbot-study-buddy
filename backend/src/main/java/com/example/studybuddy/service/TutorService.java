package com.example.studybuddy.service;

import com.example.studybuddy.dto.HistoryMessage;
import com.example.studybuddy.dto.Response;
import com.example.studybuddy.dto.TokenUsage;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * The tutor chat: a conversation that REMEMBERS earlier messages.
 *
 * How memory works here:
 *   - The LLM itself is stateless (it forgets everything between calls).
 *   - The memory advisor stores every message under a "conversation id" and, on each new call,
 *     loads that conversation's old messages and adds them to the prompt.
 *   - So the SAME id = the same conversation. A DIFFERENT id = a fresh conversation.
 */
@Service
public class TutorService {

    private final ChatClient tutor;
    private final ChatMemory chatMemory;

    // @Qualifier picks the bean named "tutorClient", because two ChatClient beans exist.
    public TutorService(@Qualifier("tutorClient") ChatClient tutor, ChatMemory chatMemory) {
        this.tutor = tutor;
        this.chatMemory = chatMemory;
    }

    /**
     * Creates a conversation id.
     *
     * Spring AI does NOT generate ids for you; an id is just a string YOU choose that means
     * "these messages belong together". A random UUID is the usual choice. Nothing is stored
     * yet: memory for this id is created the first time a message is sent with it.
     */
    public String newChatId() {
        return UUID.randomUUID().toString();
    }

    /** Sends one user message in the given conversation and returns the tutor's reply. */
    public Response chat(String chatId, String message) {
        ChatResponse response = tutor.prompt()
                .user(message)
                // REQUIRED on every call that uses a memory advisor.
                // Without it Spring AI throws IllegalArgumentException (there is no default id,
                // so that different users can never silently share one conversation).
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, chatId))
                .call()
                // chatResponse() returns the full envelope (text + metadata + token usage).
                // content() would return only the text.
                .chatResponse();

        String answer = response.getResult().getOutput().getText();
        return new Response(answer, TokenUsage.from(response));
    }

    /** Returns the stored messages of a conversation, so the UI can redraw the chat after a refresh. */
    public List<HistoryMessage> history(String chatId) {
        return chatMemory.get(chatId).stream()
                // The system prompt is stored too, but the user should not see it.
                .filter(m -> m.getMessageType() == MessageType.USER || m.getMessageType() == MessageType.ASSISTANT)
                .map(m -> new HistoryMessage(m.getMessageType().name(), m.getText()))
                .toList();
    }

    /** Forgets a conversation completely. */
    public void clear(String chatId) {
        chatMemory.clear(chatId);
    }
}
