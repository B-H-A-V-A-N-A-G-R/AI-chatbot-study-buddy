package com.example.studybuddy.dto;

/**
 * One piece of a streamed answer.
 *
 * We send each piece as a small JSON object on its own line (NDJSON) instead of a bare string.
 * Reason: raw text chunks often start or end with spaces and newlines, and those are easy to
 * lose in transit. Inside JSON they are preserved exactly.
 */
public record StreamChunk(String text) {
}
