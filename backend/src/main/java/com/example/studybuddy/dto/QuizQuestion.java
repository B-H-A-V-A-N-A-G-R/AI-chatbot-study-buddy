package com.example.studybuddy.dto;

import java.util.List;

/**
 * One multiple-choice question.
 *
 * This record is also the "shape" we ask the model to fill in: when we call
 * .entity(Quiz.class), Spring AI turns this structure into format instructions for the model
 * and then turns the model's JSON back into these Java objects.
 */
public record QuizQuestion(String question, List<String> options, int correctIndex, String explanation) {
}
