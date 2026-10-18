package com.example.studybuddy.dto;

/** A full (non-streamed) explanation together with its token usage. */
public record Response(String answer, TokenUsage usage) {
}
