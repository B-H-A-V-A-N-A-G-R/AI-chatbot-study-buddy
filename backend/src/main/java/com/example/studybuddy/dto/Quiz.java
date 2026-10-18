package com.example.studybuddy.dto;

import java.util.List;

/** A quiz: a topic and a list of questions. This is the type passed to .entity(Quiz.class). */
public record Quiz(String topic, List<QuizQuestion> questions) {
}
