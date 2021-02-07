const express = require("express")
const { WebhookClient } = require("dialogflow-fulfillment")
const mongo = require("mongodb")

const app = express()
const MongoClient = mongo.MongoClient
const url = "mongodb://localhost:27017/"
const randomstring = require("randomstring")
let userName=""


app.post('/', express.json(), (req,res)=>{
    mobileNumber = ""
    let yesNo = ""
    const agent = new WebhookClient(
        { request:req, response:res }
    )
    
    const userQuery = async agent =>{
        yesNo = agent.parameters.yesNo
        await agent.add("Please provide your username and mobile number.")
    }
   
    const identifyUser = async agent =>{
        let user = {}
        userName = agent.parameters.user_name
        mobileNumber = agent.parameters.phone_number
        console.log(userName+" "+mobileNumber)
        try{
            const client = new MongoClient(url)
            await client.connect()
            console.log(yesNo === "no")
            if(yesNo === "no"){
                const usr = {
                    username : userName,
                    mobile : mobileNumber
                }
                user = await client.db("chatbot").collection("user_info").insertOne(usr)
            } else{
                user = await client.db("chatbot").collection("user_info").findOne({mobile : mobileNumber})
            }
        } catch(err){
            await agent.add(err)
        }
        await agent.add("Welcome "+userName+" How may I help you?")
    }

    const issueSpecify = async agent => {
        await agent.add(`We have identified that you have an issue.
        Please select one of the following issues.
        1.Internet Problem
        2.Buffering Problem
        3.Speed Issue
        4.Payment Issue`)
    }

    const genTicket = async agent => {
        const issues = {
            1 : "Internet Problem",
            2 : "Buffering Problem",
            3 : "Speed Issue",
            4 : "Payment Issue"
        },
        select = agent.parameters.select,
        userIssue = issues[select],
        status  = "pending",
        ticket = randomstring.generate(7),
        dt = Date.now(),
        d = new Date(dt),
        date = d.getDate(),
        month = d.getMonth(),
        year = d.getFullYear(),
        curDate = date+" "+month+" "+year,
        issueInfo = {
            username : userName,
            issue : userIssue,
            ticket : ticket,
            date : curDate,
            status : status
        }
        console.log(select)
        if(select>4 || select<1){
            await agent.add("The number should be in the range of 1-4")
            return
        }
        try{
            const client = new MongoClient(url)
            await client.connect()
            await client.db("chatbot").collection("issues_info").insertOne(issueInfo)
        } catch(err){
            await agent.add(err)
        }
        await agent.add(`Your ${userIssue} had been registered with ticket number ${ticket}, please use ticket to check your status`)
    }
    const validateTicket = async agent => {
        const ticket = agent.parameters.ticket
        try{    
            const client = new MongoClient(url)
            await client.connect()
            const data = await client.db("chatbot").collection("issues_info").findOne({ticket:ticket})
            if(!data){
                await agent.add("Given ticket not found")
            }else if(data.username === userName){
                await agent.add("Your issue status : "+ data.status)
            }else{
                await agent.add("Access Denied, re-enter your ticket given to you")
            }
        }catch(err){
            console.log(err)
        }
    }

    let intentMap = new Map()
    intentMap.set("identifyUser", identifyUser)
    intentMap.set("issueSpecify",issueSpecify)
    intentMap.set("genTicket",genTicket)
    intentMap.set("userQuery",userQuery)
    intentMap.set("validateTicket",validateTicket)

    agent.handleRequest(intentMap)
})

app.listen(3000, () => {
    console.log("Listening at PORT 3000")
})