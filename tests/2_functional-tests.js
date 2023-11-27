const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const mongoose = require('mongoose');

chai.use(chaiHttp);

const { MongoClient, ObjectId } = require('mongodb');

const mongoURI = process.env['MONGO_URI'];
const mongoClient = new MongoClient(mongoURI);

const { findProjectByName, filterArrayByQuery } = require('../models/projectModel.js')

const { createNewIssue } = require('../models/issueModel.js')

const path = '/api/issues/test_project/?';
let globalProject;

suite('Functional Tests', function() {
  this.timeout(20000);

  // const testId = new ObjectId('507f191e810c19729de860ea');
  const testId = '507f191e810c19729de860ea';

  beforeEach((done) => {
    findProjectByName('test_project', async (err, project) => {
      if (err) { console.error(err) };

      project.issues = [];
      await project.save()
        .then(() => {
          globalProject = project;
          done()
        })
    })
  })

  test('POST Create issue with every field', (done) => {
    const testIssue = {
      _id: testId,
      issue_title: 'Test title',
      issue_text: 'Test description',
      created_by: 'Tester',
      assigned_to: 'Worker',
      status_text: 'Issue being tested'
    }

    chai
      .request(server)
      .post(path)
      .query(testIssue)
      .end((err, res) => {
        if (err) { console.error(err) }

        let receivedIssue = res.body;

        assert.equal(res.status, 200);
        assert.equal(receivedIssue.issue_title, testIssue.issue_title);
        assert.equal(receivedIssue.issue_text, testIssue.issue_text);
        assert.equal(receivedIssue.created_by, testIssue.created_by);
        assert.equal(receivedIssue.assigned_to, testIssue.assigned_to);
        assert.equal(receivedIssue.status_text, testIssue.status_text);
        done();
      });
  })

  test('POST Create issue with only required fields', (done) => {
    const testIssue = {
      issue_title: 'Required fields',
      issue_text: 'Testing required fields',
      created_by: 'Tester Required'
    }

    chai
      .request(server)
      .post(path)
      .query(testIssue)
      .end((err, res) => {
        if (err) { console.error(err) }

        let receivedIssue = res.body;
        assert.equal(res.status, 200);
        assert.equal(receivedIssue.issue_title, testIssue.issue_title);
        assert.equal(receivedIssue.issue_text, testIssue.issue_text);
        assert.equal(receivedIssue.created_by, testIssue.created_by);
        assert.equal(receivedIssue.assigned_to, '');
        assert.equal(receivedIssue.status_text, '');
        done();
      })
  })

  test('POST Issue missing required fields', (done) => {
    const testIssue = {
      issue_title: 'Test title',
      created_by: 'Tester',
      assigned_to: 'Worker',
      status_text: 'Issue being tested'
    }

    chai
      .request(server)
      .post(path)
      .query(testIssue)
      .end((err, res) => {
        if (err) { console.error(err) };

        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: 'required field(s) missing' })
        done();
      })
  })

  test('GET Array of issues with all fields present', async () => {
    let issues = await getIssues(5);
    globalProject.issues = issues;
    await globalProject.save();
    issues.map(issue => {
      issue._id = issue._id.toString();
      issue.created_on = issue.created_on.toISOString();
      issue.updated_on = issue.updated_on.toISOString();
    })

    await chai
      .request(server)
      .get(path)
      .then((res) => {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, issues)
      })
      .catch((err) => {
        if (err) { console.error(err) };
      })
  })

  test('GET Filtered issues (multiple)', async () => {
    let issues = await getIssues(6);
    globalProject.issues = issues;
    await globalProject.save()

    let filterQuery = {
      open: false,
      created_by: 'Tester 2',
    }

    issues = filterArrayByQuery(issues, filterQuery)
    issues.map(issue => {
      issue._id = issue._id.toString();
      issue.created_on = issue.created_on.toISOString();
      issue.updated_on = issue.updated_on.toISOString();
    })

    await chai
      .request(server)
      .get(path)
      .query(filterQuery)
      .then((res) => {
        assert.equal(res.status, 200);
        assert.equal(res.body.length, issues.length);
        assert.deepEqual(res.body, issues);
      })
      .catch((err) => {
        console.error(err)
      })
  })

  test('GET Filtered issues (single)', async () => {
    let issues = await getIssues(6);
    globalProject.issues = issues;
    await globalProject.save()

    let filterQuery = {
      created_by: 'Tester 2'
    }

    issues = filterArrayByQuery(issues, filterQuery)
    issues.map(issue => {
      issue._id = issue._id.toString();
      issue.created_on = issue.created_on.toISOString();
      issue.updated_on = issue.updated_on.toISOString();
    })

    await chai
      .request(server)
      .get(path)
      .query(filterQuery)
      .then((res) => {
        assert.equal(res.status, 200);
        assert.equal(res.body.length, issues.length);
        assert.deepEqual(res.body, issues);
      })
      .catch((err) => {
        console.error(err)
      })
  })

  test('PUT Successful update (single field)', (done) => {
    let testId = '64d570e71afd69521fcaec35';
    let testFields = {
      _id: testId,
      created_by: 'Beavis'
    }

    chai
      .request(server)
      .put(path)
      .query(testFields)
      .end((err, res) => {
        if (err) {console.error(err)};

        assert.equal(res.status, 200)
        assert.deepEqual(res.body, {result: 'successfully updated', _id: testId})
        done();
      })
  })

  test('PUT Successful update (multiple fields)', (done) => {
    let testId = '64d570e71afd69521fcaec35';
    let testFields = {
      _id: testId,
      open: false,
      assigned_to: 'Cornholio'
    }

    chai
      .request(server)
      .put(path)
      .query(testFields)
      .end((err, res) => {
        if (err) {console.error(err)};

        assert.equal(res.status, 200)
        assert.deepEqual(res.body, {result: 'successfully updated', _id: testId})
        done();
      })
  })

  test('PUT Update error invalid _id', (done) => {
    let wrongTestId = '64a604e99a5f78aed5d4e8f3';
    let wrongTestField = {
      _id: wrongTestId, 
      assigned_to: true
    }

    chai
      .request(server)
      .put(path)
      .query(wrongTestField)
      .end((err, res) => {
        if (err) { console.error(err) };

        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: 'could not update', _id: wrongTestId});
        done();
      })
  })

  test('PUT Missing _id returns error', (done) => {
    let testFields = {
      open: false,
      assigned_to: 'Cornholio'
    }

    chai
      .request(server)
      .put(path)
      .query(testFields)
      .end((err, res) => {
        if (err) { console.error(err) }

        assert.equal(res.status, 200);
        assert.deepEqual(res.body, {error: 'missing _id'});
        done();
      })
  })

  test('PUT No fields updated returns error', (done) => {
    let testId = '64a604e99a5f78aed5d4e8f3'
    let testFields = {
      _id: testId
    }

    chai
      .request(server)
      .put(path)
      .query(testFields)
      .end((err, res) => {
        if (err) { console.error(err) }

        assert.equal(res.status, 200);
        assert.deepEqual(res.body, {error: 'no update field(s) sent', _id: testId});
        done();
      })
  })

  test('DELETE Successful', (done) => {
    // const id = '64d583a82242bcff46e38a0d';
    
    chai
      .request(server)
      .delete(path)
      .query({ _id: testId })
      .end((err, res) => {
        if (err) { console.error(err) };
        
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { result: 'successfully deleted', '_id': testId });
        done();
      })
  })

  test('DELETE Invalid _id', (done) => {
    const id = '64c8395ff85252279708aa4a';
    
    chai
      .request(server)
      .delete(path)
      .query({ _id: id })
      .end((err, res) => {
        if (err) { console.error(err) };
        
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: 'could not delete', '_id': id});
        done();
      })
  })

  test('DELETE Missing id', (done) => {
    chai
      .request(server)
      .delete(path)
      .end((err, res) => {
        if (err) { console.error(err) };

        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: 'missing _id' });
        done();
      })
  })
});

const getIssues = async (amount) => {
  await mongoClient.connect();
  const db = mongoClient.db();
  const issuesCollection = db.collection('issues');
  let issues = await issuesCollection.find({}).limit(amount).toArray();
  await mongoClient.close();
  return issues;
}