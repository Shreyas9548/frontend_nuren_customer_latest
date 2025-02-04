
import React, { useState, useEffect } from 'react';
import './chatbot.css';
import OpenAI from "openai";
import { useParams, useNavigate } from "react-router-dom"; 
import axiosInstance from "../../api.jsx";
import MailIcon from '@mui/icons-material/Mail';
import SearchIcon from '@mui/icons-material/Search';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import uploadToBlob from "../../azureUpload.jsx";
import Picker from 'emoji-picker-react';
import ImageEditorComponent from "../../pages/documenteditpage/imageeditor.jsx";
import axios from 'axios';

import io from 'socket.io-client';

const socket = io('https://whatsappbotserver.azurewebsites.net/');


const getTenantIdFromUrl = () => {
  const pathArray = window.location.pathname.split('/');
  if (pathArray.length >= 2) {
    return pathArray[1]; // Assumes tenant_id is the first part of the path
  }
  return null; 
};

const Chatbot = () => {
  const tenantId=getTenantIdFromUrl();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [messageTemplates, setMessageTemplates] = useState({});
  const [messages, setMessages] = useState({});
  const [showSmileys, setShowSmileys] = useState(false);
  const [firebaseContacts, setFirebaseContacts] = useState([]);
  const [profileImage, setProfileImage] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');
  const [file, setFile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [conversation, setConversation] = useState(['']);
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState('');
  const [previousContact, setPreviousContact] = useState(null);
  const [newMessages, setNewMessages] = useState(['']);
  const [showBroadcastPopup, setShowBroadcastPopup] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [selectedPhones, setSelectedPhones] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);


  const openPopup = () => {
    setShowPopup(true);
  };

  const handlePopupClose = () => {
    setShowPopup(false);
  };

  
  const fetchContacts = async () => {
    try {
      const response = await axiosInstance.get('/contacts/', {
        headers: {
          token: localStorage.getItem('token'),
        },
      });
      setContacts(response.data);
     
    } catch (error) {
      console.error("Error fetching contacts data:", error);
    }
  };


  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchProfileImage = async (contactId) => {
    try {
        
        console.log('Tenant ID:', tenantId);
        console.log("this is id", contactId);

        const response = await axiosInstance.get(`/return-documents/10/${contactId}`);
        console.log('GET request successful, response:', response.data);

        const documents = response.data.documents;
        console.log('Documents array:', documents);

        if (documents && documents.length > 0) {
            const profileImage = documents[0].file;
            console.log('Found profile image:', profileImage);
            setProfileImage(profileImage);
        } else {
            console.log('No profile image found.');
            setProfileImage(null); // Set a default image URL or null if no image found
        }
    } catch (error) {
        console.error('Error fetching profile image:', error);
    }
};

  useEffect(() => {
    if ( tenantId) {
        fetchProfileImage();
    }
}, [ tenantId]);

  const generateChatbotMessage = async () => {
    try {
      if (!selectedContact) {
        console.error('No contact selected');
        return;
      }
  
      const name = `${selectedContact.first_name} ${selectedContact.last_name}`;
      const prompts = [
        `Hey ${name}! 😊 Thinking Python for AI. Simple and powerful. What do you think, ${name}?`,
        `Hi ${name}! 😄 Python's great for AI. Let's make something cool!`,
      ];
  
      const randomIndex = Math.floor(Math.random() * prompts.length);
      const prompt = prompts[randomIndex];
  
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: prompt },
        ],
      });
  
      const messageContent = response.choices[0].message.content.trim();
      setMessageTemplates(prevTemplates => ({
        ...prevTemplates,
        [selectedContact.id]: messageContent
      }));
    } catch (error) {
      console.error('Error generating WhatsApp message:', error);
    }
  };

  const handleGenerateMessage = async (e) => {
    e.preventDefault();
    await generateChatbotMessage();
  };

  const handleUploadedFile = async (event, contactId) => {
    const selectedFile = event.target.files[0];
    console.log('Selected file:', selectedFile);
    console.log('this is contactId',contactId);
    if (selectedFile) {
      setFile(selectedFile);
      console.log('File state set:', selectedFile);

      try {
        console.log('Uploading file to Azure Blob Storage...');
        const fileUrl = await uploadToBlob(selectedFile);
        console.log('File uploaded to Azure, URL:', fileUrl);

        console.log('Sending POST request to backend...');
        const response = await axiosInstance.post('/documents/', {
          name: selectedFile.name,
          document_type: selectedFile.type,
          description: 'Your file description',
          file_url: fileUrl,
          entity_type: 10,
          entity_id: contactId,
          tenant: tenantId,
        });
        console.log('POST request successful, response:', response.data);

        setUploadedFiles(prevFiles => [...prevFiles, { name: selectedFile.name, url: fileUrl }]);
        console.log('File uploaded successfully:', response.data);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    } else {
      console.log('No file selected');
    }
  };


  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to the server');
    });
    

    socket.on('new-message', (message) => {
      if (message) {
        console.log('Got New Message', selectedContact.phone);
       
  {
        if (parseInt(message.contactPhone.wa_id) == parseInt(selectedContact.phone)) {
          console.log("hogyaaaaaaaaaaaaaaaaaaaaaaaaaaaa");  
          setConversation(prevMessages => [...prevMessages, { text: message.message, sender: 'user'}]);
          setNewMessages(prevMessages => [...prevMessages, { text: message.message, sender: 'user'}]);
        }
      }}
    });

socket.on('node-message', (message) => {
  if (message) {
    
    console.log('Got New NOde Message',message);
  {
    if (message.contactPhone.wa_id === selectedContact.phone) {
    setConversation(prevMessages => [...prevMessages, { text: message.message, sender: 'bot' }]);
    }}
  }
});

    return () => {
      socket.off('node-message');
      socket.off('new-message');
    };
  }, [selectedContact]);
  
    
  const handleSend = async () => {
    setMessageTemplates('');
    if (!selectedContact || !messageTemplates[selectedContact.id]) {
      console.error('Message template or contact not selected');
      return;
    }
  
    const newMessage = { content: messageTemplates[selectedContact.id] };
  
    try {
      const payload = {
        phoneNumber: selectedContact.phone,
        message: newMessage.content,
      };
  
      const response = await axiosInstance.post(
        'https://whatsappbotserver.azurewebsites.net/send-message',
        payload,  // Let Axios handle the JSON conversion
      );
  
      // Update local state with the new message
      setConversation(prevConversation => [
        ...prevConversation,
        { text: newMessage.content, sender: 'bot' }
      ]);
      setNewMessages(prevMessages => [...prevMessages, { text: newMessage.content, sender: 'bot'}]);
      console.log("hry GPT this is a convo",conversation);
  
      
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  

  
  
  
  

  const handleMailClick = () => {
    console.log('Mail icon clicked');
    // Add functionality for mail click here
  };

  const handleVoiceClick = () => {
    console.log('Voice icon clicked');
    // Add functionality for voice click here
  };


  const filteredContacts = [
    ...contacts,
    ...firebaseContacts
  ].filter(contact => {
    const firstName = contact.first_name?.toLowerCase() || '';
    const lastName = contact.last_name?.toLowerCase() || '';
   const firebaseName= contact.name?.toLowerCase() || '';
    const search = searchText.toLowerCase();
    return firstName.includes(search) || lastName.includes(search);
  });
  

  const sendDataToBackend = async (contactPhone, conversation) => {
    try {
      const formattedConversation = conversation
        .filter(msg => msg.text && msg.text.trim() !== '') // Ensure text exists and is not empty
        .map(msg => ({
          text: msg.text,
          sender: msg.sender,
        }));
  
      if (formattedConversation.length === 0) return; // No valid messages to send
      // Example POST request using fetch API
      const response = await fetch(`https://webappbaackend.azurewebsites.net/whatsapp_convo_post/${contactPhone}/?source=whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId
        },
        body: JSON.stringify({
          contact_id: contactPhone,
          conversations: formattedConversation,
          tenant:'ll', // Assuming conversation is the array of messages
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to send data to backend');
      }
  
      console.log('Data sent to backend successfully');
  
    } catch (error) {
      console.error('Error sending data to backend:', error);
    }
  };
  
  // Function to fetch conversation data for a given contact
  const fetchConversation = async (contactId) => {
    try {
      const response = await fetch(`https://webappbaackend.azurewebsites.net/whatsapp_convo_get/${contactPhone}/?source=whatsapp`,{
        method: 'GET',
        headers: {
          'X-Tenant-Id': tenantId
        },
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch data from backend');
      }
  
      const data = await response.json();
      setConversation(data); // Update conversation state with fetched data
  
      console.log('Data fetched from backend successfully:', data);
  
    } catch (error) {
      console.error('Error fetching data from backend:', error);
    }
  };
  useEffect(() => {
    if (previousContact) {
      // Save conversation data for the previous contact
      console.log("commentsdsdsd::::::::::::::::::::::::::::::::::::",conversation);
      sendDataToBackend(previousContact.phone, newMessages);
    }
    
    // Clear current conversation
    setConversation(['']);
    setNewMessages(['']);
  
    // Fetch conversation data for the new selected contact
    if(selectedContact){
    fetchConversation(selectedContact.phone);}
    
  }, [selectedContact]);
  const handleContactSelection = async (contact) => {
    if(selectedContact){
    setPreviousContact(selectedContact);}
    console.log("contactthatiamsetting",contact);
    setSelectedContact(contact);
   
   /* if (contact && contact.id) {
      await fetchProfileImage(contact.id);
      if (!messages[contact.id]) {
        setMessages(prevMessages => ({
          ...prevMessages,
          [contact.id]: []
        }));
      }
    } else {
      console.error('Invalid contact:', contact);
    }*/
   // fetchConversation(contact.id);
  };
 /* const handleContactSelection = async (contact) => {
    if (selectedContact) {
      console.log("idhardekjhh",selectedContact.phone);
      // Store data for the previous contact
      await sendDataToBackend(selectedContact.phone, conversation);
      setPreviousContact(selectedContact);
    }
  
    // Set the previous contact to the current selected contact before updating selected contact

  
    // Update the selected contact
    setSelectedContact(contact);
  
    // Fetch profile image and conversation data for the new contact
    
    if (contact && contact.id) {
      await fetchProfileImage(contact.id);
      if (!messages[contact.id]) {
        setMessages(prevMessages => ({
          ...prevMessages,
          [contact.id]: []
        }));
      }
      // Fetch conversation data for the new contact
      //await fetchConversation(contact.phone);
    } else {
      console.error('Invalid contact:', contact);
    }
  }; */

  const handleToggleSmileys = () => {
    setShowSmileys(!showSmileys);
  };

  const handleSelectSmiley = (emoji) => {
    const newMessageTemplate = (messageTemplates[selectedContact?.id] || '') + emoji.emoji + ' ';
    setMessageTemplates(prevTemplates => ({
      ...prevTemplates,
      [selectedContact?.id]: newMessageTemplate
    }));
  };

  

    const handleRedirect = () => {
      window.location.href = 'https://www.facebook.com/v18.0/dialog/oauth?client_id=1546607802575879&redirect_uri=https%3A%2F%2Fcrm.nuren.ai%2Fll%2Fchatbot&response_type=code&config_id=1573657073196264&state=pass-through%20value';
    };

    const handleCreateFlow = () => {
      navigate(`/${tenantId}/flow`); // Use navigate instead of history.push
    };
  
    const fetchFlows = async () => {
      try {
        const response = await axiosInstance.get('https://webappbaackend.azurewebsites.net/node-templates/', {
          headers: { token: localStorage.getItem('token') },
        });
        // Ensure each flow has an id property
        const flowsWithIds = response.data.map(flow => ({
          ...flow,
          id: flow.id.toString() // Ensure id is a string for consistency
        }));
        setFlows(flowsWithIds);
        console.log('Fetched flows:', flowsWithIds);
      } catch (error) {
        console.error("Error fetching flows:", error);
      }
    };
  
    useEffect(() => {
      fetchFlows();
    }, []);
  
    const handleFlowChange = (event) => {
      const selectedValue = event.target.value;
      console.log("Selected flow ID:", selectedValue);
      setSelectedFlow(selectedValue);
      const selectedFlowData = flows.find(flow => flow.id === selectedValue);
      console.log("Selected flow data:", selectedFlowData);
    };
  
    useEffect(() => {
      console.log("Selected flow has changed:", selectedFlow);
    }, [selectedFlow]);
    const [isSending, setIsSending] = useState(false);

    const handleSendFlowData = async () => {
      if (!selectedFlow) {
        console.error('No flow selected');
        return;
      }
    
      const selectedFlowData = flows.find(flow => flow.id === selectedFlow);
      if (!selectedFlowData) {
        console.error('Selected flow data not found');
        console.log('Current flows:', flows);
        console.log('Selected flow ID:', selectedFlow);
        return;
      }
    
      try {
        setIsSending(true);
        console.log('Sending flow data:', selectedFlowData);
        const response = await axiosInstance.post('http://127.0.0.1:8000/set-flow/ ', selectedFlowData, {
          headers: {
            'Content-Type': 'application/json',
            token: localStorage.getItem('token'),
          },
        });
        console.log('Flow data sent successfully:', response.data);
        if (response.status === 200) {
          // Add user feedback here (e.g., success message)
          console.log('Flow data sent successfully');
        }
      } catch (error) {
        console.error('Error sending flow data:', error);
        // Add user feedback here (e.g., error message)
      } finally {
        setIsSending(false);
      }
    };
    useEffect(() => {
      return () => {
        // This cleanup function will run when the component unmounts
        setIsSending(false);
      };
    }, []);
    const handleBroadcastMessage = () => {
      setShowBroadcastPopup(true);
    };
    const handleCloseBroadcastPopup = () => {
      setShowBroadcastPopup(false);
      setBroadcastMessage('');
      setSelectedPhones([]);
      setIsSendingBroadcast(false);
    };
    
    const handleSendBroadcast = async () => {
      if (selectedPhones.length === 0 || !broadcastMessage.trim()) {
        alert("Please select at least one contact and enter a message.");
        return;
      }
    
      setIsSendingBroadcast(true);
    
      try {
        const response = await axiosInstance.post('https://www.sendbroadcastmessage.com', {
          contacts: selectedPhones,
          message: broadcastMessage
        }, {
          headers: {
            'Content-Type': 'application/json',
            token: localStorage.getItem('token'),
          },
        });
    
        if (response.status === 200) {
          console.log("Broadcast sent successfully");
          alert("Broadcast message sent successfully!");
          handleCloseBroadcastPopup();
        } else {
          throw new Error("Failed to send broadcast");
        }
      } catch (error) {
        console.error("Error sending broadcast:", error);
        alert("Failed to send broadcast message. Please try again.");
      } finally {
        setIsSendingBroadcast(false);
      }
    };
    
    const handlePhoneSelection = (phoneNumber) => {
      setSelectedContacts(prevSelected => 
        prevSelected.includes(phoneNumber)
          ? prevSelected.filter(num => num !== phoneNumber)
          : [...prevSelected, phoneNumber]
      );
    };

  return (
    <div className="chatbot-container">
      <div className="chatbot-chat-header">
        <h1 className='chatbot-contact'>Contact</h1>
        <div className='chatbot-contain'>
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchText}
            className='chatbot-search'
            onChange={(e) => setSearchText(e.target.value)}
          />
          <SearchIcon className="search-icon" style={{ width: '20px', height: '24px' }} />
        </div>
        <div className="scrollable-contacts">
        <h1 className='chatbot-msg'>All messages</h1>
        {filteredContacts.map(contact => (
          <div
            key={contact.id}
            className="chatbot-contacts"
            onClick={() => handleContactSelection(contact)}
            style={{ cursor: 'pointer', padding: '5px' }}
          > 
            {contact.phone} {contact.last_name} {contact.name}
          </div>
        ))}
      </div>
      </div>
      <div className="chatbot-messages-container1">
        {selectedContact && (
          <div className="contact-box">
            <div className="chat-header">
              <div className="chat-header-left">
                <div>
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="chatbot-profile-icon" />
              ):(
                <span className="account-circle">Profile Image</span>
              )}
              </div>
              <div>
                {selectedContact.phone}
                </div>
              </div>
              <div className="chat-header-right">
                <div className='box-chatbot1'>
                  <MailIcon className="header-icon" style={{ width: '20px', height: '20px' }} />
                </div>
                <div className='box-chatbot1'>
                  <CallRoundedIcon className="header-icon" style={{ width: '20px', height: '20px' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="messages">
        {selectedContact && (
          <div className="conversation-text">
            {conversation.map((message, index) => (
              <div key={index} className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}>
                {message.text !== '.' && message.text}
              </div>
            ))}
            </div>
          )}
        </div>
        <div className="chat-input-container">
          <div className="emoji-toggle-container">
            <EmojiEmotionsIcon className="header-icon-smiley" onClick={handleToggleSmileys} />
            {showSmileys && (
              <div className="emoji-picker-container">
                <Picker onEmojiClick={handleSelectSmiley} />
              </div>
            )}
          </div>
          <div className="chatbot-left-icons">
            <EditIcon className="header-icon-edit" style={{ width: '20px', height: '20px' }} />
            <label htmlFor="file-upload">
            <CloudUploadIcon className="header-icon-upload" style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
          </label>
          <input
            id="file-upload"
            type="file"
            style={{ display: 'none' }}
            onChange={handleUploadedFile}
          />
          </div>
          <div className="chatbot-typing-area">
          <textarea
            id="message"
            name="message"
            value={messageTemplates[selectedContact?.id] || ''}
            onChange={(e) => setMessageTemplates(prevTemplates => ({
              ...prevTemplates,
              [selectedContact?.id]: e.target.value
            }))}
            placeholder="Type a message"
            className="custom-chatbot-typing"
          />
          </div>
          <div className="chatbot-buttons">
            <button className="chatbot-generatemsg" onClick={handleGenerateMessage}>Generate Message</button>
            <button className='chatbot-sendmsg' onClick={handleSend}>Send</button>
          </div>
        </div>
      </div>
      <div className="chatbot-contact-section">
      <button className="chatbot-signupbutton" onClick={handleRedirect}>Sign Up</button>
      <div className="content">
      {/* Your existing content here */}
      <button onClick={openPopup} className="open-popup-button">
       Image Editor
      </button>

      {showPopup && (
        <div className="editimage-popup">
          <div className="editimage-popup-overlay" onClick={handlePopupClose}></div>
          <div className="editimage-popup-container">
            <div className="editimage-popup-content">
              <ImageEditorComponent onClose={handlePopupClose}/>
            </div>
            <button onClick={handlePopupClose} className="close-popup-button">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
        <h1 className='chatbot-details'>Contact Details</h1>
        <div>
          <button onClick={handleCreateFlow}>Create Flow</button>
          <select value={selectedFlow} onChange={handleFlowChange}>
  <option value="" disabled>Select a flow</option>
  {flows.map(flow => (
    <option key={flow.id} value={flow.id}>
      {flow.name || flow.id}
    </option>
  ))}
</select>
<button 
  onClick={handleSendFlowData} 
  className="flow-data-button"
  disabled={isSending}
>
  {isSending ? "Sending..." : "Send Flow Data"}
</button>

<button 
  onClick={handleBroadcastMessage} 
  className="broadcast-message-button"
>
  Broadcast Message
</button>

{showBroadcastPopup && (
  <div className="broadcast-popup">
    <div className="broadcast-popup-content">
      <h2>Broadcast Message</h2>
      <textarea
        value={broadcastMessage}
        onChange={(e) => setBroadcastMessage(e.target.value)}
        placeholder="Type your broadcast message here..."
      />
      <div className="contact-list">
        <h3>Select Contacts:</h3>
        {contacts.map(contact => (
          <div key={contact.id} className="contact-item">
            <input
              type="checkbox"
              id={`contact-${contact.id}`}
              checked={selectedPhones.includes(contact.id)}
              onChange={() => handlePhoneSelection(contact.id)}
            />
            <label htmlFor={`contact-${contact.id}`}>
              {contact.first_name} {contact.last_name} ({contact.phone})
            </label>
          </div>
        ))}
      </div>3

<div className="popup-buttons">
  <button 
    onClick={handleSendBroadcast} 
    disabled={isSendingBroadcast}
  >
    {isSendingBroadcast ? "Sending..." : "Send Broadcast"}
  </button>
  <button onClick={handleCloseBroadcastPopup}>Cancel</button>
</div>
    </div>
  </div>
)}
          </div>
        {selectedContact && (
          <div className="chatbot-contact-details">
            <div className="profile-info">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="chatbot-profile-image" />
              ) : (
                <span className="account-circle">Profile Image</span>
              )}
              <div>
                <h2>{selectedContact.first_name} {selectedContact.last_name} {selectedContact.name}</h2>
                
              </div>
              
                <div className="chatbot-contacts-details">
                <p className='chatbot-phone'> <CallRoundedIcon className="header-icon" style={{ width: '20px', height: '20px' }} />{selectedContact.phone}{selectedContact.id}</p>
                <p className='chatbot-mail'><MailIcon className="header-icon" style={{ width: '20px', height: '20px' }} />{selectedContact.email}</p>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chatbot;