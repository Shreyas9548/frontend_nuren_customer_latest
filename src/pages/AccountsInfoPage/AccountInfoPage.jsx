import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom"; // Import Link
import "./page.css";
import uploadToBlob from "../../azureUpload.jsx";
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useAuth } from '../../authContext.jsx'
import { FaSearchPlus, FaSearchMinus, FaDownload } from 'react-icons/fa';
import axios from "axios";
import RelatedList from "../ContactsTable/RelatedList";
import axiosInstance from "../../api";
import TopNavbar from "../TopNavbar/TopNavbar.jsx"; 
import TextSnippetRoundedIcon from '@mui/icons-material/TextSnippetRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';



//import uploadFileToAzure from "../../azureUpload.jsx";  
const getTenantIdFromUrl = () => {
  // Example: Extract tenant_id from "/3/home"
  const pathArray = window.location.pathname.split('/');
  if (pathArray.length >= 2) {
    return pathArray[1]; // Assumes tenant_id is the first part of the path
  }
  return null; // Return null if tenant ID is not found or not in the expected place
};

const AccountsPage = () => {
  const tenantId=getTenantIdFromUrl();
  const { id } = useParams(); 
    const [file, setFile] = useState(null);
    const { userId } = useAuth();
    
    const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState({});
  
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [timeline, setTimeline] = useState([]); // New state variable for timeline data
  const [showTimeline, setShowTimeline] = useState(false); 
  const [profileImage, setProfileImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [contactPersons,setContactPersons]=useState([]);
  


  const handleMoreClick = () => {
    setShowAllFiles(!showAllFiles);
  };

  const handleFileClick = (file) => {
    setSelectedFile(file);
    console.log(selectedFile)
    setShowAllFiles(false);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = selectedFile.file_url;
    link.download = selectedFile.name;
    link.click();
  };

  const closePopup = () => {
    setSelectedFile(null);
  };

  const companyInfo = {
    name: "Neuren AI",
    logo: "https://plus.unsplash.com/premium_photo-1675793715068-8cd9ce15f430?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8bG9nb3xlbnwwfHwwfHx8MA%3D%",
    website: "https://www.yourcompany.com",
    email: "info@gmail.com",
    owner: "John Doe",
    industry: "Technology",
    employees: 100,
    revenue: "$10 million",
    contactNumber: "+1 123-456-7890",
  };
 
  
 // const { id } = useParams(); 
  const [account, setAccount] = useState(null);
  const [attachments, setAttachments] = useState([]);


  const handleProfileImageUpload = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      try {
        // Fetch existing profile images
        const existingDocumentsResponse = await axiosInstance.get(`/documents/`, {
          params: {
            entity_type: 10,
            entity_id: id,
            tenant: tenantId,
            userId: userId,
            model: 'accountprofilepic' // Specific model for profile images
          }
        });

        const existingDocuments = existingDocumentsResponse.data.documents;

        // Filter documents by the specific model and delete them
        if (existingDocuments && existingDocuments.length > 0) {
          const documentsToDelete = existingDocuments.filter(doc => doc.model === 'accountprofilepic');
          for (const document of documentsToDelete) {
            await axiosInstance.delete(`/documents/${document.id}/`);
          }
        }

        // Upload the new profile image
        const fileUrl = await uploadToBlob(selectedFile, userId, tenantId);
        setProfileImage(fileUrl);

        // Save the profile image URL to the backend
        await axiosInstance.patch(`/accounts/${id}/`, { profile_image_url: fileUrl });

        // Optionally, upload the profile image as a document
        console.log('Sending POST request to backend...');
        const response = await axiosInstance.post('/documents/', {
          name: selectedFile.name,
          document_type: selectedFile.type,
          description: 'Profile image',
          file_url: fileUrl,
          entity_type: 10,       // Assuming entity_type 10 is for Accounts
          entity_id: id,
          tenant: tenantId,
          userId: userId,  
          model: 'accountprofilepic', // Update to the correct model name
        });
        console.log('POST request successful, response:', response.data);

      } catch (error) {
        console.error('Error uploading profile image:', error);
      }
    }
};

  
  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        const response = await axiosInstance.get(`/accounts/${id}`);
        setAccount(response.data);
        const contactto = await axiosInstance.get(`/contacts_of_account/${id}/`);
        setContactPersons(contactto.data);
        // console.log(response.data[0].name);  // Adjusted to correctly access the name
      } catch (error) {
        console.error("Error fetching account data:", error);
      }
    };
     




  
    fetchAccountData();
  }, [id]);

  const handleUploadedFile = async (event) => {
    const selectedFile = event.target.files[0];
    console.log('Selected file:', selectedFile);
    
    if (selectedFile) {
      setFile(selectedFile);
      console.log('File state set:', selectedFile);
  
      try {
        console.log('Uploading file to Azure Blob Storage...');
        const fileUrl = await uploadToBlob(selectedFile, userId, tenantId);
        console.log('File uploaded to Azure, URL:', fileUrl);
  
        console.log('Sending POST request to backend...');
        const response = await axiosInstance.post('/documents/', {
          name: selectedFile.name,
          document_type: selectedFile.type,
          description: 'Uploaded file',
          file_url: fileUrl,
          entity_type: 10,      // Assuming entity_type 10 is for Accounts
          entity_id: id,
          tenant: tenantId,
          userId: userId,  
          model: 'account'    // Updated to the correct model name
        });
        console.log('POST request successful, response:', response.data);
  
        const newFile = { name: selectedFile.name, url: fileUrl };
        setUploadedFiles(prevFiles => {
          const updatedFiles = [...prevFiles, newFile];
          localStorage.setItem('uploadedFiles', JSON.stringify(updatedFiles));
          return updatedFiles;
        });
        console.log('File uploaded successfully:', response.data);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    } else {
      console.log('No file selected');
    }
  };
  
  const fetchUploadedFiles = async () => {
    try {
      console.log('Fetching uploaded files...');
      const response = await axiosInstance.get(`/documents/}`, {
        params: {
          entity_type: 10,      // Assuming entity_type 10 is for Accounts
          entity_id: id,
          tenant: tenantId,
          userId: userId,
          model: 'account'     // Updated to the correct model name
        }
      });
  
      const documents = response.data.documents || [];
      setUploadedFiles(documents);
      console.log('documnt of this contact',documents );
      localStorage.setItem('uploadedFiles', JSON.stringify(documents));
      console.log('Fetched files:', documents);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
    }
  };
  
  useEffect(() => {
    // Initialize the state from local storage if available
    const storedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];
    setUploadedFiles(storedFiles);
      fetchUploadedFiles();
  }, [id, tenantId, userId]);
  

  const renderFiles = (files) => {
    return files.map((file, index) => (
      <li key={index} className="account-file-item">
        <span className="file-icon">📄</span>
        <a href={file.url} target="_blank" rel="noopener noreferrer" onClick={() => handleFileClick(file)}>{file.name}</a>
      </li>
    ));
  };

  useEffect(() => {
    const fetchProfileImage = async () => {
      try {
        console.log('Fetching profile image for account:', id);
        console.log('Tenant ID:', tenantId);

        const response = await axiosInstance.get(`/documents`, {
          params: {
            entity_type: 10,     // Entity type as required
            entity_id: id,       // Use the appropriate id
            tenant: tenantId,    // Tenant ID from context or state
            userId: userId,      // User ID from context or state
            model: 'accountprofilepic' // Updated model name
          }
        });
        console.log('GET request successful, response:', response.data);

        const documents = response.data.documents;
        if (documents && documents.length > 0) {
          const profileImage = documents[0].file; // Assuming the first document is the latest
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

    if (id && tenantId) {
      fetchProfileImage();
    }
  }, [id, tenantId, userId]);

  

  if (!account) {
    return <div className="loader"></div>; // Show a loading message while fetching data
  }

  

  const fetchTimeline = async () => {
    try {
      const response = await axiosInstance.get(`/return-interaction/9/${id}/`);
      setTimeline(response.data.interactions); // Set the timeline with interactions array
      console.log('Timeline data fetched successfully:', response.data);
    } catch (error) {
      console.error('Error fetching timeline data:', error);
    }
  };
  const toggleTimeline = async () => {
    setShowTimeline(prevShowTimeline => !prevShowTimeline);
    if (!showTimeline && timeline.length === 0) { // Check if timeline is empty
      await fetchTimeline();
    }
  };

  /*const accountInfo = {
    accountNumber: "ACC123456789",
    accountType: "Premium",
    startDate: "01/01/2022",
    renewalDate: "01/01/2023",
  };

  const addressInfo = {
    street: "123 Main Street",
    city: "Anytown",
    state: "CA",
    zip: "12345",
    country: "USA",
  };*/

  const handleFileUpload = (event) => {
    const files = event.target.files;
    setAttachments([...attachments, ...files]);
  };
  

  const handleDeleteAttachment = (index) => {
    const updatedAttachments = [...attachments];
    updatedAttachments.splice(index, 1);
    setAttachments(updatedAttachments);
  };
  const relatedListItems = [
    
    "Attachments",
   "Purchase Orders",
    "Emails",
    "Invoices",
    "Company Overview",
    "Contacts",
    "Account Information",
    "Address Information",
  ];
  const handleScrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };
  const getCircleColor = (letter) => {
    const colors = ['#ff6347', '#32cd32', '#1e90ff', '#ff69b4', '#ffd700']; // Define your color palette
    const index = letter.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleEdit1 = () => {
    setIsEditing(true);
  };
  const handleEdit2 = () => {
    setIsEditing(true);
  };
  const handleEdit3 = () => {
    setIsEditing(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axiosInstance.patch(`/accounts/${id}/`, editedValues);
      console.log('Form submitted successfully:', response.data);
      // Optionally, you can update the local state with the response data
      setAccount(response.data);
      
    } catch (error) {
      console.error('Error submitting form:', error);
    }
    setIsEditing(false);

    const interactionData = {
      entity_type: "Account",
      entity_id: id,
      interaction_type: "Note",
      tenant_id: tenantId, 
      notes: `User with ${id} makes changes in the details of the ${id}`,
    };
  
    try {
        await axiosInstance.post('/interaction/', interactionData);
        console.log('Interaction logged successfully');
      } catch (error) {
        console.error('Error logging interaction:', error);
      }
  }

  const handleCancel = () => {
    setIsEditing(false);
    setEditedValues(account); // Reset edited values to original opportunity data
  };

  const handleZoomIn = () => {
    setZoomLevel(prevZoomLevel => prevZoomLevel * 1.2);
  };

  const handleZoomOut = () => {
    setZoomLevel(prevZoomLevel => prevZoomLevel / 1.2);
  };

  
  return (
    <>
     <div className="account_nav">
    <TopNavbar/>
  </div>
      <div className="classs">
        <div className="buttonss">
          <div className="pages1">
            <div className="relatedList-Accounts">
              <Link to={`/${tenantId}/accounts`}> Back</Link>
            </div>

            {/* <RelatedList title="Related List" items={relatedListItems} /> */}
            <div className="sidebar1">
        <ul>
          {relatedListItems.map((item) => (
            <li key={item}>
              <a href={`#${item}`} onClick={() => handleScrollToSection(item)}>
                {item}
              </a>
            </li>
          ))}
        </ul>
      </div>
          </div>
          <div className="blank-page1">
            {/* Header */}

            <div className="header">
              <h1 className="viewaccounts">View Account</h1>
              <label htmlFor="profile-image-upload" className="upload-image-label">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="profile-image" />
              ) : (
                <span className="account-circle1" style={{ backgroundColor: getCircleColor(account.company.charAt(0)) }}>
                  {account.company.charAt(0).toUpperCase()}
                </span>
              )}
              <input
                type="file"
                id="profile-image-upload"
                onChange={handleProfileImageUpload}
                style={{ display: 'none' }}
              />
               </label>
             
                     
              <a
                href={`mailto:${account.email}`}
                className="sendemailInfo"
                style={{ float: "right", color: "white" }}
              >
                Send Email
              </a>
              <button className="timeline-button-account" onClick={toggleTimeline}>
            {showTimeline ? 'Hide Timeline' : 'Show Timeline'}
          </button>
              <div className="header-content">
                <h1 className="header-content1">{account.company}</h1>
              </div>
             <div className="account-descp">
              {account.description}
             </div>

              <a
                className="visitwebsite"
                href={account.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Website
              </a>
            </div>
           <div>
           {!showTimeline && (

           <div>
            <div className="company-overview" id='Company Overview'>
      <h2 className="accountinfos">Company Overview</h2>
      <div className="accounts-button">
        <button className="edit-button" onClick={handleEdit1} disabled={isEditing}>Edit</button>
        {isEditing && (
          <>
            <button className="save-button" onClick={handleSubmit}>Save</button>
            <button className="cancel-button" onClick={handleCancel}>Cancel</button>
          </>
        )}
      </div>
      <div className="account-details">
        <div className="info-row">
          <div className="info-pair">
            <label htmlFor="Name">Account Owner:</label>
            <input
              type="text"
              id="Name"
              name="Name"
              value={isEditing ? editedValues.Name : account.Name}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="info-pair">
            <label htmlFor="industry">Industry:</label>
            <input
              type="text"
              id="industry"
              name="industry"
              value={isEditing ? editedValues.industry : account.industry}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
        </div>
        <div className="info-row">
          <div className="info-pair">
            <label htmlFor="description">Description:</label>
            <input
              type="text"
              id="description"
              name="description"
              value={isEditing ? editedValues.description : account.description}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="info-pair">
            <label htmlFor="employees">Employees:</label>
            <input
              type="text"
              id="employees"
              name="employees"
              value={isEditing ? editedValues.employees : companyInfo.employees}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
        </div>
        <div className="info-row">
          <div className="info-pair">
            <label htmlFor="revenue">Annual Revenue:</label>
            <input
              type="text"
              id="revenue"
              name="revenue"
              value={isEditing ? editedValues.revenue : companyInfo.revenue}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="info-pair">
            <label htmlFor="phone">Contact Number:</label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={isEditing ? editedValues.phone : account.phone}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
      </div>
      </div>
      </div>

            <div className="contacts" id="Contacts">
              <ul className="list-group">
                  {contactPersons?contactPersons.map((contact, index) => (
                    <li key={index} className="list-group-item">
                      <strong>Name:</strong> {contact.name}
                      <br />
                      <strong>Position:</strong> {contact.position}
                      <br />
                      <strong>Email:</strong> {contact.email}
                      <br />
                      <strong>Phone:</strong> {contact.phone}
                    </li>
                  )):<h2>No contacts in this account</h2>}
              </ul>
            </div>
            <div className="account-info" id="Account Information">
              <h2 className="accountinfos">Account Information</h2>
              <div className="accounts-button">
        <button className="edit-button" onClick={handleEdit2} disabled={isEditing}>Edit</button>
        {isEditing && (
          <>
            <button className="save-button" onClick={handleSubmit}>Save</button>
            <button className="cancel-button" onClick={handleCancel}>Cancel</button>
          </>
        )}
      </div>
      <div className="addresssinformation">
        <div className="info-row">
          <div className="info-pair">
            <label htmlFor="accountNumber">Account Number:</label>
            <input
              type="text"
              id="accountNumber"
              name="accountNumber"
              value={isEditing ? editedValues.accountNumber : account.id}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="info-pair">
            <label htmlFor="accountType">Account Type:</label>
            <input
              type="text"
              id="accountType"
              name="accountType"
              value={isEditing ? editedValues.accountType : account.name}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
        </div>
        <div className="info-row">
          <div className="info-pair">
            <label htmlFor="startDate">Start Date:</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={isEditing ? editedValues.startDate :account.name}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="info-pair">
            <label htmlFor="renewalDate">Renewal Date:</label>
            <input
              type="date"
              id="renewalDate"
              name="renewalDate"
              value={isEditing ? editedValues.renewalDate : account.name}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
        </div>
      </div>
      </div>
            <div className="address-info" id="Address Information">
              <h2 className="accountinfos">Address Information</h2>
              <div className="accounts-button">
        <button className="edit-button" onClick={handleEdit3} disabled={isEditing}>Edit</button>
        {isEditing && (
          <>
            <button className="save-button" onClick={handleSubmit}>Save</button>
            <button className="cancel-button" onClick={handleCancel}>Cancel</button>
          </>
        )}
      </div>
      <div className="addressOverview">
      <div className="addresssinformation">
        <div className="info-row">
          <div className="info-pair">
            <label htmlFor="street">Street:</label>
            <input
              type="text"
              id="street"
              name="street"
              value={isEditing ? editedValues.street : account.name}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="info-pair">
            <label htmlFor="city">City:</label>
            <input
              type="text"
              id="city"
              name="city"
              value={isEditing ? editedValues.city :account.name}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
        </div>
        <div className="info-row">
          <div className="info-pair">
            <label htmlFor="state">State:</label>
            <input
              type="text"
              id="state"
              name="state"
              value={isEditing ? editedValues.state : account.name}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
          <div className="info-pair">
            <label htmlFor="zip">ZIP Code:</label>
            <input
              type="text"
              id="zip"
              name="zip"
              value={isEditing ? editedValues.zip : account.name}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
        </div>
        <div className="info-row">
          <div className="info-pair">
            <label htmlFor="country">Country:</label>
            <input
              type="text"
              id="country"
              name="country"
              value={isEditing ? editedValues.country : account.name}
              onChange={handleChange}
              readOnly={!isEditing}
            />
          </div>
        </div>
      </div>
    </div>
    </div>
           
    <div className="attachment-section" id="Attachments">
      <div className="attachments">Attachments</div>
      <div className="attachment-upload">
        <input
          type="file"
          id="attachment-input"
          onChange={handleUploadedFile}
          style={{ display: 'none' }}
        />
        <label htmlFor="attachment-input">
          <div className="clicktoupload">click to upload</div>
        </label>
      </div>
      <div className="uploaded-files">
        <ul>
          {renderFiles(uploadedFiles.slice(0, 3))}
        </ul>
        {uploadedFiles.length > 3 && (
         <a href="#" className="show-more-button" onClick={handleMoreClick}>
         Show More
       {showAllFiles ? 'Show Less' : ''}
            </a>
        )}
      </div>
      {showAllFiles && (
        <div className="popup">
          <div className="popup-content">
            <h2>Uploaded Files</h2>
            <button className="close-button" onClick={handleMoreClick}>Close</button>
            <ul>
              {renderFiles(uploadedFiles)}
            </ul>
          </div>
        </div>
      )}
    </div>
            </div>
            )}
             {showTimeline && timeline.length > 0 && (
  <div className="timeline-account">
    <div className='timeline-btn-account'>
      <button className='timeline-btn1-account'>Deals</button>
      <button className='timeline-btn2-account'>Messages</button>
      <button className='timeline-btn3-account'>Schedule</button>
      <button className='timeline-btn4-account'>Activity Log </button>
    </div>
    <ul>
      {timeline.map((interaction, index) => (
        <li className='timeline-oopo1-account' key={index} >
        <div>
        <div className='data-timeline-account'>
            <p className='textdesign-account'>  <TextSnippetRoundedIcon style={{height:'40px',width:'30px',fill:'#F9623EFF',marginLeft:'7px'  }}/>   </p>
            <h1 className='contract-account'>Signed Contract</h1>
          </div>
          <div className='dotted-line'></div>

        
          <div className='timeline_data1-account'>
          {interaction.interaction_type}

          </div>
        </div>

         <div className='time-box2-account'>
         <div className='data-timeline-account'>
            <p className='textdesign1-account'>  <CallRoundedIcon style={{height:'40px',width:'30px',fill:'#6D31EDFF',marginLeft:'7px'  }}/>   </p>
            <h1 className='contract-account'>Made Call</h1>
          </div>
          <div className='timeline_data1-account'>
          {interaction.datetime}

          </div>
         </div>
         <div className='dotted-line'></div>

         <div className='time-box2-account'>
         <div className='data-timeline-account'>
            <p className='textdesign1-account'>  <FactCheckRoundedIcon style={{height:'40px',width:'30px',fill:'#3D31EDFF',marginLeft:'7px'  }}/>   </p>
            <h1 className='contract-account'>Sent email</h1>
          </div>
          <div className='timeline_data1-account'>
          {interaction.datetime}

          </div>
         </div>
         <div className='dotted-line'></div>

         <div className='time-box2-account'>
         <div className='data-timeline-account'>
            <p className='textdesign1-account'>  <MailOutlineRoundedIcon style={{height:'40px',width:'30px',fill:'#FF56A5FF',marginLeft:'7px'  }}/>   </p>
            <h1 className='contract-account'>Called</h1>
          </div>
          <div className='timeline_data1-account'>
          {interaction.interaction_type}

          </div>
         </div>
        </li>
      ))}
    </ul>
  </div>
)}
   
           </div>
    {selectedFile && (
        <div className="file-popup">
          <div className="file-popup-content">
            <div className="file-popup-header">
              <h2>{selectedFile.name}</h2>
              <div className="file-preview-container">
        <div className="zoom-buttons">
          <button onClick={handleZoomIn}>
            <i className="fas fa-search-plus"></i>
          </button>
          <button onClick={handleZoomOut}>
            <i className="fas fa-search-minus"></i>
          </button>
          <button onClick={handleDownload}>
            <i className="fas fa-download"></i>
          </button>
        </div>
      </div>
              <button onClick={closePopup}>Close</button>
            </div>
            <TransformWrapper>
              <TransformComponent>
                <iframe
                  src={selectedFile.file_url}
                  style={{ width: '100%', height: '500px' }}
                  title={selectedFile.name}
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountsPage;