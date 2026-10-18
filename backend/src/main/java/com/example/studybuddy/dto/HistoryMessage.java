package com.example.studybuddy.dto;

/**
 * One stored message of a conversation, used to re-draw the chat after a page refresh.
 * role is "USER" or "ASSISTANT" (the system prompt is not returned).
 */
public record HistoryMessage(String role, String text) {
}
