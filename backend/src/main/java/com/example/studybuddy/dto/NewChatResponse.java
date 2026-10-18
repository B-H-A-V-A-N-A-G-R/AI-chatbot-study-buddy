package com.example.studybuddy.dto;

/** Returned when the user starts a new chat. The frontend keeps this id and sends it with every message. */
public record NewChatResponse(String chatId) {
}
