# HybridBanking-FeedbackManager

This project shows how a customer on a mobile device like an Android phone could interact with support staff in a banking service center. The customer is able to check the account status and to submit a feedback message to the customer support via a Customer Loyality App (see architecture below). The bank's staff sees the incoming messages with enhanced context data in an internal Feedback Manager application. If the message was submitted in a language other than English, the message is translated and presented together with the original notice. The service personnel can respond to the customer and issue reward points. The response is directly pushed back to the customer's mobile device.

The Customer Loyality App connects to backend services hosted on [Bluemix Public](http://www.bluemix.net). The internal Feedback Manager could reside on a Bluemix Dedicated or Bluemix Local. Both application use integration services like the Secure Gateway or API Management to securely access resources in the bank's data center.

Watch a walkthrough of an earlier version of this demo by following this link:
https://www.youtube.com/watch?v=7OLkIGoBpi0

Instructions for the installation and the demo are available in this repository: https://github.com/IBM-Bluemix/HybridBanking-Android
