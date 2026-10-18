package com.example.studybuddy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point. Nothing AI-specific here:
 * Spring Boot auto-configuration sees the Anthropic starter on the classpath and creates
 * the ChatModel bean and a ChatClient.Builder bean for us (see AiConfig for how we use them).
 */
@SpringBootApplication
public class StudyBuddyApplication {

    public static void main(String[] args) {
        SpringApplication.run(StudyBuddyApplication.class, args);
    }
}
