package com.example.studybuddy.controller;

import com.example.studybuddy.dto.*;
import com.example.studybuddy.service.TutorService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * REST endpoints for the tutor chat. Typical flow used by the React app:
 *
 *   POST   /api/tutor/chats                       -> {"chatId": "..."}   (user clicks "New chat")
 *   POST   /api/tutor/chats/{chatId}/messages     -> tutor reply          (user sends a message)
 *   GET    /api/tutor/chats/{chatId}/messages     -> stored history       (page refresh)
 *   DELETE /api/tutor/chats/{chatId}              -> forget the chat
 *
 * The chatId in the URL is the "conversation id" that makes memory work.
 */
@RestController
@RequestMapping("/api/tutor")
public class TutorController {

    // Tokens cost money and every message is re-sent later as history, so we cap the size.
    private static final int MAX_MESSAGE_LENGTH = 2000;

    private final TutorService tutorService;

    public TutorController(TutorService tutorService) {
        this.tutorService = tutorService;
    }

    @PostMapping("/chats")
    public NewChatResponse newChat() {
        return new NewChatResponse(tutorService.newChatId());
    }

    @PostMapping("/chats/{chatId}/messages")
    public Response send(@PathVariable String chatId, @RequestBody MessageRequest request) {
        String message = request.message();
        if (message == null || message.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message must not be empty.");
        }
        if (message.length() > MAX_MESSAGE_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Message is too long (max " + MAX_MESSAGE_LENGTH + " characters).");
        }
        return tutorService.chat(chatId, message.trim());
    }

    @GetMapping("/chats/{chatId}/messages")
    public List<HistoryMessage> history(@PathVariable String chatId) {
        return tutorService.history(chatId);
    }

    @DeleteMapping("/chats/{chatId}")
    public void clear(@PathVariable String chatId) {
        tutorService.clear(chatId);
    }
}
