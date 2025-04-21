import React from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";

const FailedAssignationsModal = ({ show, handleClose, failedAssignations }) => (
  <Modal show={show} onHide={handleClose} size="lg" centered>
    <Modal.Header closeButton>
      <Modal.Title>Failed Assignations</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {failedAssignations.length === 0 ? (
        <p>No failed assignations to display.</p>
      ) : (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Course</th>
              <th>Professor</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {failedAssignations.map(item => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.Course}</td>
                <td>{item.Professor}</td>
                <td>{item.reason}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={handleClose}>
        Close
      </Button>
    </Modal.Footer>
  </Modal>
);

export default FailedAssignationsModal;
