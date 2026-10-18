package com.example.studybuddy.dto;

/** Body of POST /api/tutor/chats/{chatId}/messages. */
public record MessageRequest(String message) {
}
