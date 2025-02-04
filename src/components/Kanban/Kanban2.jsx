import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import "./style.css";
import axios from "axios";
import { NavLink } from "react-router-dom";
import axiosInstance from "../../api.jsx";
import { Delete } from "@mui/icons-material";
import { AiOutlineRobot } from "react-icons/ai";
import { Modal } from '@mui/material';

const getTenantIdFromUrl = () => {
  const pathArray = window.location.pathname.split('/');
  if (pathArray.length >= 2) {
    return pathArray[1]; // Assumes tenant_id is the first part of the path
  }
  return null; // Return null if tenant ID is not found or not in the expected place
};

const colors = [
  "#2C3E50", // Dark Slate Blue
  "#2980B9", // Strong Blue
  "#BDC3C7", // Silver
  "#7F8C8D", // Grayish
  "#AAB7B8", // Cool Gray
  "#34495E", // Blue Gray
  "#1ABC9C", // Strong Cyan
  "#95A5A6", // Light Gray
  "#5D6D7E"  // Soft Blue Gray
];

const Kanban2 = () => {
  const tenantId = getTenantIdFromUrl();
  const [columns, setColumns] = useState({});
  const [stages, setStages] = useState([]);
  const [newStageTitle, setNewStageTitle] = useState("");
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
const [popupContent, setPopupContent] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [loadingMessage, setLoadingMessage] = useState('');

const loadingMessages = [
  "Analyzing data patterns...",
  "Generating insightful suggestions...",
  "Crunching numbers at light speed...",
  "Unlocking hidden potential in your opportunities...",
  "Preparing to blow your mind with AI magic..."
];


useEffect(() => {
  let interval;
  if (isLoading) {
    interval = setInterval(() => {
      setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
    }, 3000);
  }
  return () => clearInterval(interval);
}, [isLoading]);


const handleAiButtonClick = async (card) => {
  setIsLoading(true);
  setPopupOpen(true);
  setLoadingMessage(loadingMessages[0]);

  const prompt = `analyse this opportunity and suggest me the best way to handle it`;

  try {
    const response = await axiosInstance.post(`/query/`, { 
      prompt, 
      tenant: tenantId
    });
    const result = response.data;
    showOpportunityPopup(result);
  } catch (error) {
    console.error('Error fetching AI suggestion:', error);
    showOpportunityPopup("An error occurred while fetching AI suggestions. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

const showOpportunityPopup = (content) => {
  setPopupContent(content);
};

const handleClosePopup = () => {
  setPopupOpen(false);
  setPopupContent('');
};


  const handleDoubleClick = (columnId, currentTitle) => {
    setEditingColumnId(columnId);
    setNewTitle(currentTitle);
  };
  const handleAddStage = async () => {
    try {
      // Determine the model_name from the URL
      
      const model_name = "opportunity"; // Assuming last part of path is model_name
      console.log("status", newStageTitle,"model_name", model_name);
      // Make POST request to create a new stage
      const response = await axiosInstance.post('/stage/create/', {
        status: newStageTitle,
        model_name: model_name
      });
  
      // Log response and update UI as needed
      console.log('New stage created:', response.data);
  
    // Assuming you have a function to fetch stages and update state
    } catch (error) {
      console.error('Error creating new stage:', error);
    }
  };

  const handleDeleteOpportunity = async (opportunityId) => {
    if (window.confirm("Are you sure you want to delete this opportunity?")) {
      try {
        await axiosInstance.delete(`/opportunities/${opportunityId}/`);
        setColumns(prevColumns => {
          const updatedColumns = {...prevColumns};
          for (let columnId in updatedColumns) {
            updatedColumns[columnId].cards = updatedColumns[columnId].cards.filter(card => card.id !== opportunityId);
            updatedColumns[columnId].count = updatedColumns[columnId].cards.length;
          }
          return updatedColumns;
        });
      } catch (error) {
        console.error('Error deleting opportunity:', error);
      }
    }
  };

  const handleDeleteStage = async (columnId) => {
    try {
      // Check if the stage has cards (leads)
      const column = columns[columnId];
      if (column.cards.length > 0) {
        alert("Cannot delete stage with cards. Please move or delete all cards first.");
        return;
      }

     
  
      // Make DELETE request to delete the stage
      await axiosInstance.delete(`/stage/delete/${columnId}/`);
  
      // Update the columns state to reflect the deleted stage
      const updatedColumns = { ...columns };
      delete updatedColumns[columnId];
      setColumns(updatedColumns);
  
      // Optionally fetch stages again if needed
      fetchStagesAndColors(); // Assuming you have a function to fetch stages and update state
    } catch (error) {
      console.error('Error deleting stage:', error);
    }
  };
  const handleSaveClick = async (columnId) => {
    try {
      // Replace 'your_stage_id' with the actual stage ID you want to update
      const response = await axiosInstance.post(`/stage/update/${columnId}/`, {
        status: newTitle,
      });

      console.log('Response:', response.data);
      // Update the columns state with the new title
      // This assumes you have a function to update the columns state
      updateColumnTitle(columnId, newTitle);

      setEditingColumnId(null);
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  const updateColumnTitle = (columnId, newTitle) => {
    // Implement this function to update the column title in your state
    setColumns((prevColumns) => ({
      ...prevColumns,
      [columnId]: {
        ...prevColumns[columnId],
        title: newTitle,
      },
    }));
  };
  useEffect(() => {
    const fetchStagesAndColors = async () => {
      try {
        const response = await axiosInstance.get('opportunity/stage/');
        const stagesData = response.data;

        if (stagesData && stagesData.stages && Array.isArray(stagesData.stages)) {
          const stagesWithColors = stagesData.stages.map((stage, index) => {
            const color = colors[index % colors.length]; // Use color from the predefined array
            return { ...stage, color }; // Add the color to the stage object
          });
          setStages(stagesWithColors);
        } else {
          console.error("Fetched stages data is not an array:", stagesData);
        }
      } catch (error) {
        console.error("Error fetching stages and colors:", error);
      }
    };

    fetchStagesAndColors();
  }, []);

  useEffect(() => {
    if (stages.length === 0) return;
  
    const fetchOpportunities = async () => {
      try {
        const response = await axiosInstance.get('/opportunities/');
        const opportunities = response.data;
  
        // Initialize categorizedOpportunities object
        const categorizedOpportunities = {};
        stages.forEach((stage) => {
          categorizedOpportunities[stage.id] = [];
        });
  
        // Categorize opportunities into respective stages
        opportunities.forEach(opportunity => {
          const stageId = opportunity.stage; // Adjust based on your actual opportunity data structure
          if (categorizedOpportunities[stageId]) {
            categorizedOpportunities[stageId].push(opportunity);
          } else {
            console.error(`Unknown stage ID: ${stageId} for opportunity with ID: ${opportunity.id}`);
          }
        });
  
        // Map opportunities to cards for each column
        const columnsData = {};
        stages.forEach((stage) => {
          const count = categorizedOpportunities[stage.id].length || 0;
          const cards = mapOpportunitiesToCards(categorizedOpportunities[stage.id]);
          columnsData[stage.id] = {
            title: stage.status, // Ensure `title` is set correctly
            count,
            cards,
            bg: stage.color // Set the background color
          };
        });
  
        // Set the columns state with the mapped cards and opportunity count
        setColumns(columnsData);
      } catch (error) {
        console.error("Error fetching opportunities:", error);
      }
    };
  
    fetchOpportunities();
  }, [stages]);

  const mapOpportunitiesToCards = (opportunities) => {
    if (!Array.isArray(opportunities)) {
      console.error("Expected opportunities to be an array but received:", opportunities);
      return [];
    }

    return opportunities.map((opportunity) => ({
      id: opportunity.id.toString(),
      name: opportunity.name,
      stage: opportunity.stage,
      amount: opportunity.amount,
      lead_source: opportunity.lead_source,
      probability: opportunity.probability,
      closedOn: opportunity.closedOn,
      description: opportunity.description,
      createdOn: opportunity.createdOn,
      isActive: opportunity.isActive,
      account: opportunity.account,
      contacts: opportunity.contacts,
      closedBy: opportunity.closedBy,
      createdBy: opportunity.createdBy,
      tenant: opportunity.tenant
    }));
  };

  const onDragEnd = async (result) => {
    const { source, destination,draggableId } = result;
    if (!destination) return;

    const startColumn = columns[source.droppableId];
    const endColumn = columns[destination.droppableId];

    if (startColumn === endColumn) {
      const newCards = Array.from(startColumn.cards);
      newCards.splice(source.index, 1);
      newCards.splice(destination.index, 0, startColumn.cards[source.index]);
      const newColumn = {
        ...startColumn,
        cards: newCards,
      };
      setColumns({ ...columns, [source.droppableId]: newColumn });
    } else {
      const startCards = Array.from(startColumn.cards);
      const endCards = Array.from(endColumn.cards);
      const [movedCard] = startCards.splice(source.index, 1);
      endCards.splice(destination.index, 0, {
        ...movedCard,
        stage: endColumn.title,
      });
      
      try {
        // Prepare the data for the PUT request
        const opportunityData = {
          ...movedCard,
          stage: destination.droppableId, // Using the new stage ID
          name: movedCard.name,
          amount: movedCard.amount,
          lead_source: movedCard.lead_source,
          probability: movedCard.probability,
          closedOn: movedCard.closedOn,
          description: movedCard.description,
          isActive: movedCard.isActive,
          account: movedCard.account,
          contacts: movedCard.contacts,
          closedBy: movedCard.closedBy,
          createdBy: movedCard.createdBy,
          tenant: tenantId,
        };
  
        // Make a PUT request to update the opportunity in the backend
        await axiosInstance.put(`/opportunities/${movedCard.id}/`, opportunityData);
        console.log('Opportunity updated successfully');
  

      // Log the interaction
      const interactionData = {
        entity_type: "Opportunity",
        entity_id: movedCard.id,
        interaction_type: "Note",
        tenant_id: tenantId, // Make sure you have tenant_id in movedCard
        notes: `Stage changed from ${startColumn.title} to ${endColumn.title}. Opportunity ID: ${movedCard.id}. Contact: ${movedCard.contact}.`,
        interaction_datetime: new Date().toISOString(),
        stage: destination.droppableId ,
      };

      await axiosInstance.post('/interaction/', interactionData);
      console.log('Interaction logged successfully');

      const newColumns = {
        ...columns,
        [source.droppableId]: { ...startColumn, cards: startCards },
        [destination.droppableId]: { ...endColumn, cards: endCards },
      };
      setColumns(newColumns);

    } catch (error) {
      console.error('Error updating opportunity or logging interaction:', error);
      // Optionally, you can revert the state change here if the API call fails
    }
  }
  };



 

  const handleTitleChange = (e) => {
    setNewTitle(e.target.value);
  };



  return (
    <>
    <br />
    <div className="Kanban">
    <div className="leaad_column add_leaad-column">
  <div className="add-column-content">
    <button onClick={handleAddStage} className="add-button">+</button>
    <input
      type="text"
      placeholder="New Stage"
      value={newStageTitle}
      onChange={(e) => setNewStageTitle(e.target.value)}
    />
  </div>
</div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          {Object.keys(columns).map((columnId) => {
            const column = columns[columnId];
            return (
              <div className="column" key={columnId}>
                <div className="title htext1" style={{ backgroundColor: column.bg }} onDoubleClick={() => handleDoubleClick(columnId, column.title)}>
                  {editingColumnId === columnId ? (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={handleTitleChange}
                        style={{ marginRight: '5px',backgroundColor:column.bg }}
                      />
                      <button onClick={() => handleSaveClick(columnId)} style={{ fontSize: '0.8rem' }}>Save</button>
                    </div>
                  ) : (
                    <>
                      {column.title} ({column.count})
                      <button onClick={() => handleDeleteStage(columnId)} disabled={columns[columnId].cards.length > 0} className="delete-column-btn"><Delete/></button>
                    </>
                  )}
                </div>
                <Droppable droppableId={columnId}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="card-list"
                        >
                          {column.cards.map((card, index) => (
                            <Draggable
                              key={card.id}
                              draggableId={card.id}
                              index={index}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="card_"
                                >
                                  <div className="license">
                                    {card.amount} licenses
                                    <div className="status">{card.stage}</div>
                                    <button 
          onClick={() => handleDeleteOpportunity(card.id)} 
          className="delete-lead-btn"
        >
          <Delete style={{fontSize:'16px'}}/>
        </button>
        <button 
    onClick={() => handleAiButtonClick(card)}
    className="ai-button"
  >
    <AiOutlineRobot style={{fontSize: '20px'}}/>
  </button>
  <Modal
  open={popupOpen}
  onClose={handleClosePopup}
  aria-labelledby="ai-suggestion-popup"
  aria-describedby="ai-suggestion-description"
  className="modal"
>
  <div className="ai-popup-content">
    <h2>AI Insights</h2>
    {isLoading ? (
      <>
        <div className="ai-loader"></div>
        <p className="ai-loading-message">{loadingMessage}</p>
      </>
    ) : (
      <div className="ai-insights-content">
        {Array.isArray(popupContent) ? (
          popupContent.map((insight, index) => (
            <div key={index} className="ai-insight-item">
              <h3>Insight {index + 1}</h3>
              <p>{insight}</p>
            </div>
          ))
        ) : (
          <div className="ai-insight-item">
            <p>{popupContent}</p>
          </div>
        )}
      </div>
    )}
    <button onClick={handleClosePopup}>Close</button>
  </div>
</Modal>
                                  </div>
                                  <div className="content_">
                                    <NavLink to={`/${tenantId}/ShowOpportunity/${card.id}`}>
                                      <div className="c1">{card.name}</div>
                                    </NavLink>
                                    <div className="c2">
                                      {card.lead_source}
                                      <div className="r1">{card.probability}%</div>
                                    </div>
                                    <div className="c2">
                                      {card.closedOn}
                                      <div className="r1">${card.amount}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

              </div>
            );
          })}
          {/* <div className="column add-column">
            <input
              type="text"
              placeholder="New Stage"
              value={newStageTitle}
              onChange={(e) => setNewStageTitle(e.target.value)}
            />
            <button onClick={handleAddStage}>+</button>
          </div> */}
        </div>
      </DragDropContext>
    </div>
  </>
  );
};

export default Kanban2;

