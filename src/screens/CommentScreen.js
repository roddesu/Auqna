import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, FlatList, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const CommentScreen = ({ route, navigation }) => {
  const { postId, post_content, post_created_at } = route.params; // Get postId, post_content, and post_created_at from the previous screen
  const [commentText, setCommentText] = useState('');
  const [userId, setUserId] = useState(null);
  const [comments, setComments] = useState([]); // State to hold comments
  const [loading, setLoading] = useState(false); // Loading state for fetching comments
  const [posting, setPosting] = useState(false); // Loading state for posting a comment

  // Get logged-in user details from AsyncStorage
  const fetchUserId = async () => {
    try {
      const loggedInUser = await AsyncStorage.getItem('loggedInUser');
      if (loggedInUser) {
        const user = JSON.parse(loggedInUser);
        setUserId(user.id); // Assuming user object has an id field
      } else {
        Alert.alert('Not Logged In', 'Please log in to post a comment.');
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Error fetching user from AsyncStorage:', error);
      Alert.alert('Error', 'An error occurred while checking your login status.');
    }
  };

  // Fetch comments for the post
  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://192.168.1.3:3001/get-comments/${postId}`);
      if (response.status === 200) {
        setComments(response.data.comments);
      } else {
        Alert.alert('Error', 'Post not found or no comments available for this post.');
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'There was an issue fetching comments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  

  // Immediately add the comment to the comments list after posting it
  const addCommentToUI = (comment) => {
    setComments((prevComments) => [comment, ...prevComments]);
  };

  // Handle comment submission to backend
  const handleCommentSubmission = async () => {
    if (!commentText.trim()) {
      Alert.alert('Empty Comment', 'Please write a comment before submitting.');
      return;
    }

    if (!userId) {
      Alert.alert('Not Logged In', 'Please log in to comment.');
      return;
    }

    setPosting(true); // Set posting state to true when submitting a comment

    try {
      const response = await axios.post('http://192.168.1.3:3001/create-comment', {
        postId,
        userId,
        comment: commentText,
      });

      if (response.status === 201) {
        Alert.alert('Comment Posted', 'Your comment has been posted.');
        setCommentText('');  // Clear the comment input after posting

        // Immediately update the UI with the new comment
        const newComment = {
          comment_id: response.data.comment.id,
          comment_content: commentText,
          created_at: new Date().toISOString(),
        };
        addCommentToUI(newComment); // Optimistic UI Update: Add the new comment to the list
      } else {
        Alert.alert('Error', 'There was an issue posting your comment. Please try again later.');
      }
    } catch (error) {
      console.error('Error posting comment:', error.response ? error.response.data : error.message);
      Alert.alert('Error', error.response ? error.response.data.message : 'There was an issue posting your comment.');
    } finally {
      setPosting(false); // Set posting state to false after submission
    }
  };

  // Fetch user ID and comments when the component mounts
  useEffect(() => {
    fetchUserId();
    fetchComments(); // Fetch comments for the current post
  }, []);

  return (
    <View style={styles.container}>
      {/* Display the post details */}
      <View style={styles.postDetailsContainer}>
        <Text style={styles.postUser}>
          Anonymous • {moment(post_created_at).format('MMMM Do YYYY, h:mm:ss a')}
        </Text>
      </View>

      {/* Display the original post content */}
      <View style={styles.originalPostContainer}>
        <Text style={styles.originalPostText}>{post_content}</Text>
      </View>

      {/* Input for the user to write their comment */}
      <TextInput
        style={styles.commentInput}
        placeholder="Write your comment here..."
        value={commentText}
        onChangeText={setCommentText}
        placeholderTextColor="#888"
      />
      
      {/* Button to post the comment */}
      <TouchableOpacity style={styles.commentButton} onPress={handleCommentSubmission}>
        {posting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Post Comment</Text>
        )}
      </TouchableOpacity>

      {/* Display the list of comments */}
      {loading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <FlatList
          data={comments}
          renderItem={({ item }) => (
            <View style={styles.commentContainer}>
              <Text style={styles.commentText}>{item.comment_content}</Text>
              <Text style={styles.commentDate}>{moment(item.created_at).format('MMMM Do YYYY, h:mm:ss a')}</Text>
            </View>
          )}
          keyExtractor={(item) => item.comment_id.toString()}
          style={styles.commentsList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#757272', // Dark background color
    padding: 20,
    paddingTop: 30, // Added top padding to give more space from the top edge
  },
  postDetailsContainer: {
    marginBottom: 15, // Added bottom margin to space out the content
    paddingHorizontal: 15, // Padding for the post details container
    marginTop: 20, // Margin from the top for visibility
  },
  postUser: {
    color: '#FFFFFF', // White text color for the user's details
    fontSize: 18, // Increased font size for better visibility
    fontWeight: 'bold',
    textAlign: 'center', // Center the post user and timestamp
  },
  originalPostContainer: {
    backgroundColor: '#4D1616', // Dark red to match Homepage post background
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 15, // Padding for content spacing
  },
  originalPostText: {
    color: '#FFFFFF', // White text color for visibility
    fontSize: 18, // Increased font size for readability
    fontWeight: 'bold',
    textAlign: 'center', // Center the post content
  },
  commentInput: {
    backgroundColor: '#FFFFFF',
    color: '#333',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  commentButton: {
    backgroundColor: '#575757', // Dark button for visibility
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF', // White text color on button
    fontWeight: 'bold',
  },
  commentsList: {
    marginTop: 20, // Add margin top to separate comments from the input area
  },
  commentContainer: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  commentText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  commentDate: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'right',
  },
});

export default CommentScreen;
