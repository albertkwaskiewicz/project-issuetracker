'use strict';
const { Project, findProjectByName, filterArrayByQuery } = require('../models/projectModel.js')
const { createNewIssue, updateIssue, deleteIssue } = require('../models/issueModel.js')

module.exports = function(app) {

  app.route('/api/issues/:project')

    .get(function(req, res) {
      console.log('GET...')
      let project = req.params.project;
      let query = isObjectEmpty(req.query) ? null : formatQuery(req.query);
      
      findProjectByName(project, (err, data) => {
        if (err) { 
          console.error(err)
           res.json(`Error: ${err}`)
        };

        let issues = query ? filterArrayByQuery(data.issues, query) : data.issues;

        res.json(issues);
      })
    })

    .post(function(req, res) {
      console.log('POST...')
      let projectName = req.params.project;
      let issueQuery = req.query;

      findProjectByName(projectName, (err, project) => {
        if (err) { console.error(err) };

        createNewIssue(issueQuery, async (err, issue) => {
          if (err) { 
            console.error(err);
            res.json({ error: err });
          } else {
            project.issues.push(issue);
            // console.log(project)
            await project.save()
              .then(() => { res.json(issue) })
          }
        })
      });
    })

    .put(async (req, res) => {
      console.log('PUT...')
      let updateQuery = req.query;

      let doesQueryHaveId = Object.hasOwn(updateQuery, '_id');

      if (doesQueryHaveId) {
        let id = updateQuery._id;

        if (Object.keys(updateQuery).length == 1) {
          res.json({error: 'no update field(s) sent', _id: id})
        } else {
          let fields = formatQuery(updateQuery);
          fields.updated_on = Date.now()
          delete fields._id;

          // console.log('Fields', fields);
          
          updateIssue(id, fields)
            .then((issue) => {
              // console.log('Updated issue', issue)
              issue ? res.json({ result: 'successfully updated', '_id': id}) : res.json({ error: 'could not update', '_id': id});
            })
            .catch((err) => {
              console.log('Update error', err)
              res.json({ error: 'could not update', '_id': id });
            })
        }
      } else {
        res.json({error: 'missing _id'})
      }
    })

    .delete(async (req, res) => {
      console.log('DELETE...')
      let issueId;
      
      if (Object.hasOwn(req.query, '_id')) {
        issueId = req.query._id;

        await deleteIssue(issueId)
          .then((issue) => {
            // console.log('Deleted issue', issue)
            issue ? res.json({ result: 'successfully deleted', '_id': issueId}) : res.json({ error: 'could not delete', '_id': issueId});
          })
          .catch((err) => {
            res.json({ error: 'could not delete', '_id': issueId})
          })
        
      } else {
        res.json({ error: 'missing _id' });
      }
    });
};

const formatQuery = (query) => {
  Object.keys(query).forEach(key => {
    if (query[key] == 'true') {
      query[key] = true
    } else if (query[key] == 'false') {
      query[key] = false
    }
  })
  return query
}

const isObjectEmpty = (obj) => {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }
  return true;
}