import React, { useRef, useEffect, useState } from 'react';
import 'tui-image-editor/dist/tui-image-editor.css';
import ImageEditor from '@toast-ui/react-image-editor';
import axios from "axios";
import { v4 as uuidv4 } from 'uuid';
import uploadToBlob from "../../azureUpload.jsx";
import './style.css';
import { Sidebar } from '../../components/Sidebar';
import axiosInstance from '../../api.jsx';
import { useAuth } from '../../authContext.jsx'
const secretKey = import.meta.env.VITE_MY_KEY_FOR_AI;

const getTenantIdFromUrl = () => {
  const pathArray = window.location.pathname.split('/');
  if (pathArray.length >= 2) {
    return pathArray[1]; // Assumes tenant_id is the first part of the path
  }
  return null; 
};

const ImgLogo = '../../assets/bar-graph.png'; // Adjust the path as per your project structure

const myTheme = {
  'common.bi.image': ImgLogo,
  'common.backgroundColor': '#f5f5f5',
  'header.backgroundImage': 'none',
  // Add more customizations as needed
};

const samplePrompts = [
  "You are a professional graphic designer. Create the markekting graphics for the following request. Be very professional and donot display text unless specifically asked =>",
  "Design an image showcasing email campaign analytics   Use a sleek and modern style with green and white accents.",
  "Create an image of a modern business dashboard for a marketing CRM with no text above the image. The dashboard should display key performance indicators such as sales growth, customer acquisition, and conversion rates. Use a clean and professional design with a blue and white color scheme",
  "Generate a professional marketing image for a Sales CRM targeting medium enterprises in finance, featuring a light blue to white background, green and orange accents, dark gray text, a modern office photo with CRM icons and interface screenshots highlighting workflows and lead management, incorporating a sales performance chart, centered company logo with Roboto font",
];

const ImageEditorComponent = ({ onUpload }) => {
  const { userId } = useAuth();
  const tenantId = getTenantIdFromUrl();
  const editorRef = useRef(null);
  const [prompt, setPrompt] = useState(samplePrompts[0]);
  const [additionalSpecifications, setAdditionalSpecifications] = useState('');
  const [imageURL, setImageURL] = useState('');
  const [variations, setVariations] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(samplePrompts[0]);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');

  const handleGenerateImage = async () => {
    try {
      const fullPrompt = `${selectedPrompt}. ${additionalSpecifications}`;
      console.log('this is the prompt ', fullPrompt);
      console.log('this is the prompt ', secretKey);
      const response = await axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          prompt: fullPrompt,
          n: 1,
          response_format: 'b64_json',
          model: "dall-e-3"
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`, // Replace with your actual API key
          },
        }
      );
      console.log('Generated image URL:', response.data.data[0].b64_json);

      const base64Data = response.data.data[0].b64_json;

      setImageURL(`data:image/png;base64,${base64Data}`);

      // Load the generated image onto the main canvas
      loadImageFromURL(`data:image/png;base64,${base64Data}`);
    } catch (error) {
      console.error("Error generating image:", error);
    }
  };

  const loadImageFromURL = (url) => {
    if (url) {
      const editorInstance = editorRef.current.getInstance();
      editorInstance.loadImageFromURL(url, 'GeneratedImage')
        .then((sizeValue) => {
          editorInstance.ui.activeMenuEvent();
          editorInstance.ui.resizeEditor({ imageSize: sizeValue });
          console.log("Image loaded successfully.");
        })
        .catch((err) => {
          console.error("Failed to load image", err);
        });
    }
  };

  const handleGenerateVariations = async () => {
    try {
      // Fetch the image as a blob
      const imageResponse = await axios.get(imageURL, { responseType: 'blob' });

      // Convert the blob to a base64 string
      const reader = new FileReader();
      reader.readAsDataURL(imageResponse.data);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1]; // Get the base64 string without the prefix
        // Send the request to generate variations
        const response = await axios.post(
          "https://api.openai.com/v1/images/variations",
          {
            image: base64data,
            n: 1,
            response_format: 'b64_json',
            size: "512x512",
          },
          {
            headers: {
              Authorization: `Bearer ${secretKey}`, // Replace with your actual API key
              'Content-Type': 'application/json'
            },
          }
        );

        const variationUrls = response.data.data.map(variation => `data:image/png;base64,${variation.b64_json}`);
        setVariations(variationUrls);
        console.log('Generated variations URLs:', variationUrls);
      };
    } catch (error) {
      console.error("Error generating image variations:", error);
    }
  };

  const handleClick = async () => {
    await handleGenerateImage();
  };

  const handleGenerateVariationsClick = async () => {
    await handleGenerateVariations();
  };

  const handleVariationClick = (url) => {
    loadImageFromURL(url);
  };

  const handleUploadEditedImage = async () => {
    try {
      const editorInstance = editorRef.current.getInstance();
      const editedImage = editorInstance.toDataURL();

      // Convert the data URL to a blob
      const blob = await fetch(editedImage).then(res => res.blob());

      // Generate a unique filename using UUID
      const uniqueFileName = `${uuidv4()}.png`;

      // Create form data and append necessary fields
      const formData = new FormData();
      formData.append('file', blob, uniqueFileName);
      formData.append('name', uniqueFileName);  // Use unique filename
      formData.append('document_type', blob.type);  // Use blob type
      formData.append('description', 'Your file description');  // Hardcoded description
      formData.append('entity_type', '1');  // Hardcoded entity_type
      formData.append('entity_id', '12345');  // Hardcoded entity_id
      formData.append('tenant', tenantId);  

      // Upload the edited image to your endpoint
      const response = await axiosInstance.post('/documents/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadedImageUrl = response.data.url; // Adjust based on your API response structure
      setUploadedImageUrl(uploadedImageUrl);

      console.log('Edited image uploaded:', response.data);
      if (onUpload) {
        onUpload(uploadedImageUrl);  // Pass uploaded image URL to parent component
      }
    } catch (error) {
      console.error('Error uploading edited image:', error);
    }
  };

  const handleUploadToAzure = async () => {
    try {
      const editorInstance = editorRef.current.getInstance();
      const editedImage = editorInstance.toDataURL();

      // Convert the data URL to a blob
      const blob = await fetch(editedImage).then(res => res.blob());

      // Upload the blob to Azure Blob Storage
      const uploadedUrl = await uploadToBlob(new File([blob], `${uuidv4()}.png`, { type: blob.type }),userId,tenantId);
      console.log('Image uploaded to Azure:', uploadedUrl);

      if (onUpload) {
        onUpload(uploadedUrl);  // Pass uploaded image URL to parent component
      }
    } catch (error) {
      console.error('Error uploading image to Azure:', error);
    }
  };

  useEffect(() => {
    if (imageURL) {
      loadImageFromURL(imageURL);
    }
  }, [imageURL]);

  return (
    <div className="editor-container">
      <div className="editor-content">
        <ImageEditor
          ref={editorRef}
          includeUI={{
            theme: myTheme,
            menu: ['shape', 'filter', 'text'],
            initMenu: 'text',
            uiSize: {
              width: '100%',
              height: '100vh',
            },
            menuBarPosition: 'bottom',
          }}
          cssMaxHeight={5000}
          cssMaxWidth={7000}
          selectionStyle={{
            cornerSize: 20,
            rotatingPointOffset: 70,
          }}
          usageStatistics={false}
        />
      </div>
      <div className="prompt-container">
        <div className="prompt-controls">
          <select
            value={selectedPrompt}
            onChange={(e) => {
              setSelectedPrompt(e.target.value);
              setPrompt(e.target.value);
            }}
            className="prompt-select"
          >
            {samplePrompts.map((prompt, index) => (
              <option key={index} value={prompt}>
                {prompt}
              </option>
            ))}
          </select>
          <textarea
            value={additionalSpecifications}
            onChange={(e) => setAdditionalSpecifications(e.target.value)}
            placeholder="Additional specifications"
            className="prompt-textarea"
          />
          <button onClick={handleClick} className="generate-button">Generate Image</button>
          <button onClick={handleGenerateVariationsClick} className="generate-variations-button">Generate Variations</button>
          <button onClick={handleUploadEditedImage} className="upload-button">Upload Edited Image</button>
          <button onClick={handleUploadToAzure} className="upload-button">Upload to Azure</button>
        </div>
        <div className="variations-container">
          {variations.map((variation, index) => (
            <img
              key={index}
              src={variation}
              alt={`Variation ${index + 1}`}
              onClick={() => handleVariationClick(variation)}
              className="variation-image"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ImageEditorPage1 = () => {
  const handleImageUpload = (url) => {
    console.log('Uploaded Image URL:', url);
    // Additional logic after uploading the image
  };

  return (
    <>
   
      <div className="image-editor-page">
        <iframe src="https://www.photopea.com/" style={{width:'100vh',height:'100vh'}}></iframe>
        {/*<ImageEditorComponent onUpload={handleImageUpload} />*/}
      </div>
    </>
  );
};

export default ImageEditorPage1;
