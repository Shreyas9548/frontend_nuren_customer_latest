import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  applyNodeChanges,
  applyEdgeChanges
} from "reactflow";
import "reactflow/dist/style.css";
import { AskQuestionNode, SendMessageNode, SetConditionNode } from './NodeTypes';
import Sidebar from "./Sidebar";
import "./FlowBuilder.css";
import SaveFlowPopup from "./SaveFlowPopup";
import axiosInstance from "../../api";
import { FlowProvider, useFlow } from './FlowContext';

let id = 0;
const getId = () => `${id++}`;

const nodeTypes = {
  askQuestion: AskQuestionNode,
  sendMessage: SendMessageNode,
  setCondition: SetConditionNode
};

const FlowBuilderContent = () => {
  const { nodes, setNodes, edges, setEdges, updateNodeData } = useFlow();
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const { templateId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [isExistingFlow, setIsExistingFlow] = useState(false);
  const [existingFlows, setExistingFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState('');
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');


  const resetFlow = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setFlowName('');
    setFlowDescription('');
    setIsExistingFlow(false);
    setSelectedFlow('');
  }, [setNodes, setEdges]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  useEffect(() => {
    fetchExistingFlows();
  }, []);

  const fetchExistingFlows = async () => {
    try {
      const response = await axiosInstance.get('/node-templates/');
      setExistingFlows(response.data);
    } catch (error) {
      console.error('Error fetching existing flows:', error);
    }
    setIsLoading(false);
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
  
      const type = event.dataTransfer.getData("application/reactflow");
  
      if (typeof type === "undefined" || !type) {
        return;
      }
  
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
  
      const newId = getId();
      let newNodeData = { id: newId, label: `${type} node` };
    
      if (type === 'askQuestion') {
        newNodeData = { id: newId, question: '', options: [] };
      } else if (type === 'sendMessage') {
        newNodeData = { id: newId, fields: [{ type: 'Message', content: '' }] };
      } else if (type === 'setCondition') {
        newNodeData = { id: newId, condition: '' };
      }
  
      const newNode = {
        id: newId,
        type,
        position,
        data: newNodeData,
      };
  
      setNodes((nds) => {
        const updatedNodes = nds.concat(newNode);
        console.log('Nodes after adding:', updatedNodes);
        return updatedNodes;
      });
    },
    [reactFlowInstance, setNodes]
  );

  const saveFlow = useCallback(async () => {
    console.log('Current nodes:', nodes);
  console.log('Current edges:', edges);
  const flow = {
    name: flowName,
    description: flowDescription,
    category: "default",
    node_data: {
      nodes: nodes.map(({ id, type, position, data }) => {
        const { updateNodeData, ...cleanData } = data;
        return { id, type, position, data: cleanData };
      }),
      edges: edges
    }
  };
  console.log('Flow to be saved:', flow);
  
  try {
    const response = await axiosInstance.post('/node-templates/', flow);
    console.log('Flow saved successfully:', response.data);
    setShowSavePopup(false);
    setIsExistingFlow(true);
    setSelectedFlow(flowName);
    fetchExistingFlows();
    navigate('/ll/chatbot');
  } catch (error) {
    console.error('Error saving flow:', error);
  }
}, [nodes, edges, flowName, flowDescription, navigate, fetchExistingFlows]);

  const handleSaveConfirm = (name, description) => {
    setFlowName(name);
    setFlowDescription(description);
    saveFlow();
  };

  useEffect(() => {
    fetchExistingFlows();
  }, []);

  useEffect(() => {
    // Reset the flow when the component mounts
    resetFlow();
  }, [resetFlow]);

  const handleFlowSelect = useCallback(async (e) => {
    const flowId = e.target.value;
    setSelectedFlow(flowId);
    
    if (flowId === 'create_new') {
      resetFlow();
    } else if (flowId) {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(`/node-templates/${flowId}/`);
        const flow = response.data;
        
        const mappedNodes = flow.node_data.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            updateNodeData: (newData) => updateNodeData(node.id, newData),
          },
        }));

        setNodes(mappedNodes);
        setEdges(flow.node_data.edges);
        setFlowName(flow.name);
        setFlowDescription(flow.description);
        setIsExistingFlow(true);
      } catch (error) {
        console.error('Error fetching flow:', error);
        resetFlow();
      } finally {
        setIsLoading(false);
      }
    }
  }, [setNodes, setEdges, updateNodeData, resetFlow]);


  return (
    <div className="flow-builder">
      <Sidebar />
      <ReactFlowProvider>
        <div className="reactflow-wrapper" ref={reactFlowWrapper}>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              fitView
            >
              <Controls />
              <MiniMap />
              <Background />
            </ReactFlow>
          )}
        </div>
      </ReactFlowProvider>
      <div className="sidebar">
        <button onClick={() => setShowSavePopup(true)}>Save Flow</button>
        <select value={selectedFlow} onChange={handleFlowSelect}>
          <option value="">Select a flow</option>
          <option value="create_new">Create New Flow</option>
          {existingFlows.map(flow => (
            <option key={flow.id} value={flow.id}>{flow.name}</option>
          ))}
        </select>
      </div>
      {showSavePopup && (
        <SaveFlowPopup
          onSave={handleSaveConfirm}
          onCancel={() => setShowSavePopup(false)}
        />
      )}
    </div>
  );
};

const FlowBuilder = () => (
  <FlowProvider>
    <ReactFlowProvider>
      <FlowBuilderContent />
    </ReactFlowProvider>
  </FlowProvider>
);

export default FlowBuilder;