import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Container, Row, Col } from 'react-bootstrap';
import ScheduleVariantModal from './ScheduleVariantModal';
import { toast } from 'react-toastify';
import axios from 'axios';

// Assuming API base URL is defined elsewhere
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const ScheduleVariantContainer = () => {
  const { departmentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [variants, setVariants] = useState([]);
  const [priorities, setPriorities] = useState({
    prioritizedProfessor: [],
    prioritizedRoom: [],
    prioritizedSections: []
  });

  useEffect(() => {
    // Check if we have variants in localStorage when component mounts
    const storedVariants = localStorage.getItem('scheduleVariants');
    if (storedVariants) {
      const parsedData = JSON.parse(storedVariants);
      if (parsedData.departmentId === departmentId) {
        setVariants(parsedData.variants);
      }
    }
  }, [departmentId]);

  const generateVariants = async () => {
    setLoading(true);
    setShowModal(true);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/schedules/variants`, {
        DepartmentId: departmentId,
        variantCount: 2,
        ...priorities
      });
      
      if (response.data.successful) {
        setVariants(response.data.variants);
        
        // Save to localStorage
        localStorage.setItem('scheduleVariants', JSON.stringify({
          variants: response.data.variants,
          departmentId,
          timestamp: Date.now()
        }));
        
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message || 'Failed to generate schedule variants');
      }
    } catch (error) {
      console.error('Error generating variants:', error);
      toast.error(error.response?.data?.message || 'An error occurred while generating schedule variants');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVariant = async (variantIndex) => {
    setLoading(true);
    
    try {
      const selectedVariant = variants[variantIndex];
      
      const response = await axios.post(`${API_BASE_URL}/schedules/save-variant`, {
        variant: selectedVariant,
        DepartmentId: departmentId
      });
      
      if (response.data.successful) {
        toast.success('Schedule variant saved successfully!');
        setShowModal(false);
        
        // You might want to refresh the schedule display here
        // refreshScheduleDisplay();
      } else {
        toast.error(response.data.message || 'Failed to save schedule variant');
      }
    } catch (error) {
      console.error('Error saving variant:', error);
      toast.error(error.response?.data?.message || 'An error occurred while saving the schedule variant');
    } finally {
      setLoading(false);
    }
  };

  // Optional: Clear variants from local storage
  const clearVariants = () => {
    localStorage.removeItem('scheduleVariants');
    setVariants([]);
    toast.info('Stored schedule variants cleared');
  };

  return (
    <Container>
      <Row className="mb-3">
        <Col>
          <Button 
            variant="primary" 
            onClick={generateVariants}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Schedule Variants'}
          </Button>
          
          {variants.length > 0 && (
            <Button 
              variant="outline-secondary" 
              className="ms-2" 
              onClick={() => setShowModal(true)}
            >
              View Saved Variants
            </Button>
          )}
          
          {variants.length > 0 && (
            <Button 
              variant="outline-danger" 
              className="ms-2" 
              onClick={clearVariants}
            >
              Clear Variants
            </Button>
          )}
        </Col>
      </Row>
      
      <ScheduleVariantModal
        show={showModal}
        onHide={() => setShowModal(false)}
        variants={variants}
        loading={loading}
        onSelectVariant={handleSelectVariant}
        departmentId={departmentId}
      />
    </Container>
  );
};

export default ScheduleVariantContainer;