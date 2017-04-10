-- phpMyAdmin SQL Dump
-- version 3.2.3
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Jan 08, 2017 at 07:29 PM
-- Server version: 5.1.40
-- PHP Version: 5.3.3

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";

--
-- Database: `c3`
--

-- --------------------------------------------------------

--
-- Table structure for table `games`
--

DROP TABLE IF EXISTS `games`;
CREATE TABLE IF NOT EXISTS `games` (
  `code` varchar(256) NOT NULL,
  `start` int(11) NOT NULL DEFAULT '0',
  `duration` int(11) NOT NULL DEFAULT '10',
  `turn` tinyint(4) NOT NULL,
  `rounds` int(11) NOT NULL DEFAULT '0',
  `player_0` int(11) NOT NULL DEFAULT '0',
  `player_1` int(11) NOT NULL DEFAULT '0',
  `player_2` int(11) NOT NULL DEFAULT '0',
  `player_3` int(11) NOT NULL DEFAULT '0',
  KEY `code` (`code`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
