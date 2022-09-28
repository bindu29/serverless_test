-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Feb 23, 2022 at 08:15 AM
-- Server version: 8.0.21
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `kpi_sso_outbound`
--

-- --------------------------------------------------------

--
-- Table structure for table `ob_oauth_access_tokens`
--

DROP TABLE IF EXISTS `ob_oauth_access_tokens`;
CREATE TABLE IF NOT EXISTS `ob_oauth_access_tokens` (
  `access_token_id` bigint NOT NULL AUTO_INCREMENT,
  `access_token` text COMMENT 'System generated access token',
  `refresh_token` text COMMENT 'System generated refresh token',
  `root_companies_id` bigint DEFAULT NULL COMMENT 'ob_oauth_applications.root_companies_id',
  `client_id` varchar(255) DEFAULT NULL COMMENT 'ob_oauth_applications.client_id',
  `authorization_code_id` bigint DEFAULT NULL COMMENT 'ob_oauth_authorization_codes.authorization_code_id',
  `access_token_expires` datetime DEFAULT NULL COMMENT 'When the access token becomes invalid',
  `refresh_token_expires` datetime DEFAULT NULL COMMENT 'When the refresh token becomes invalid',
  `scope` text COMMENT 'Space-delimited list scopes code can request',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`access_token_id`),
  KEY `root_companies_id` (`root_companies_id`),
  KEY `client_id` (`client_id`),
  KEY `authorization_code_id` (`authorization_code_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ob_oauth_applications`
--

DROP TABLE IF EXISTS `ob_oauth_applications`;
CREATE TABLE IF NOT EXISTS `ob_oauth_applications` (
  `root_companies_id` bigint NOT NULL AUTO_INCREMENT,
  `application_name` varchar(255) DEFAULT NULL,
  `hcs_id` varchar(255) DEFAULT NULL COMMENT 'The EHR System ID',
  `client_id` varchar(255) DEFAULT NULL COMMENT 'A unique client identifier',
  `client_secret` varchar(255) DEFAULT NULL COMMENT 'Used to secure Client Credentials Grant',
  `grant_types` text COMMENT 'Space-delimited list of permitted grant types',
  `scope` text COMMENT 'Space-delimited list of permitted scopes',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `status` enum('0','1') DEFAULT '1' COMMENT '0: Inactive; 1: Active',
  PRIMARY KEY (`root_companies_id`),
  UNIQUE KEY `actions_unique` (`client_id`,`client_secret`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ob_oauth_applications`
--

INSERT INTO `ob_oauth_applications` (`root_companies_id`, `application_name`, `hcs_id`, `client_id`, `client_secret`, `grant_types`, `scope`, `created_at`, `updated_at`, `status`) VALUES
(1, 'Local App', '70dd3d62-bccc-4069-8d5b-9107a843908a', 'e2e13b16-8276-4b8e-8949-13ddadcea83f', NULL, 'authorization_code refresh_token', 'launch openid Patient.Read(R4)', '2022-02-21 22:47:21', '2022-02-21 17:16:19', '1'),
(2, 'Dev App', '10745fb5-5784-4364-86c4-691e682b2ef9', '198cca00-7eb4-4d19-8074-87f16a1f3038', NULL, 'authorization_code refresh_token', 'launch openid Patient.Read(R4)', '2022-02-21 22:48:21', '2022-02-21 17:17:44', '1'),
(3, 'Test App', '46e92f57-1927-4133-a9a0-30f1ab364b11', 'f4144190-88c1-4b78-a7c5-999c6dd9f355', NULL, 'authorization_code refresh_token', 'launch openid Patient.Read(R4)', '2022-02-21 22:48:57', '2022-02-21 17:18:33', '1'),
(4, 'ePDMP Test', 'f6c51067-d85f-4fd1-b3ce-60008dba8567', '86c8438d-e98e-4279-8aa1-52efed091adf', NULL, 'authorization_code refresh_token', 'launch openid Patient.Read(R4)', '2022-02-21 22:49:38', '2022-02-21 17:19:12', '1');

-- --------------------------------------------------------

--
-- Table structure for table `ob_oauth_authorization_codes`
--

DROP TABLE IF EXISTS `ob_oauth_authorization_codes`;
CREATE TABLE IF NOT EXISTS `ob_oauth_authorization_codes` (
  `authorization_code_id` bigint NOT NULL AUTO_INCREMENT,
  `authorization_code` text COMMENT 'kpi token obtained from kpi proxy server',
  `root_companies_id` bigint DEFAULT NULL COMMENT 'ob_oauth_applications.root_companies_id',
  `client_id` varchar(255) DEFAULT NULL COMMENT 'ob_oauth_applications.client_id',
  `user_id` varchar(255) DEFAULT NULL COMMENT 'user id from kpi proxy response',
  `redirect_uri` varchar(255) DEFAULT NULL COMMENT 'URI to redirect user after authorization',
  `expires` datetime DEFAULT NULL COMMENT 'When the code becomes invalid',
  `scope` text COMMENT 'Space-delimited list scopes code can request',
  `id_token` text COMMENT 'JSON web token used for OpenID Connect',
  `kpi_proxy_response` text COMMENT 'KPI Proxy response',
  `authorization_code_used` enum('0','1') DEFAULT '0' COMMENT 'Authorization code status: 0 :- Unused; 1 :- Used',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`authorization_code_id`),
  KEY `root_companies_id` (`root_companies_id`),
  KEY `client_id` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ob_oauth_cors_uris`
--

DROP TABLE IF EXISTS `ob_oauth_cors_uris`;
CREATE TABLE IF NOT EXISTS `ob_oauth_cors_uris` (
  `cors_uri_id` bigint NOT NULL AUTO_INCREMENT,
  `root_companies_id` bigint DEFAULT NULL COMMENT 'ob_oauth_applications.root_companies_id',
  `client_id` varchar(255) DEFAULT NULL COMMENT 'ob_oauth_applications.client_id',
  `cors_uri` text COMMENT 'Allowed CORS Origins',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`cors_uri_id`),
  KEY `root_companies_id` (`root_companies_id`),
  KEY `client_id` (`client_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ob_oauth_cors_uris`
--

INSERT INTO `ob_oauth_cors_uris` (`cors_uri_id`, `root_companies_id`, `client_id`, `cors_uri`, `created_at`, `updated_at`) VALUES
(1, 1, 'e2e13b16-8276-4b8e-8949-13ddadcea83f', 'http://localhost:5000', '2022-02-21 23:04:55', '2022-02-21 17:34:31'),
(2, 1, 'e2e13b16-8276-4b8e-8949-13ddadcea83f', 'http://localhost:5001', '2022-02-21 23:04:55', '2022-02-21 17:34:31'),
(3, 2, '198cca00-7eb4-4d19-8074-87f16a1f3038', 'http://3.212.160.215:5001', '2022-02-21 23:06:08', '2022-02-21 17:35:18'),
(4, 2, '198cca00-7eb4-4d19-8074-87f16a1f3038', 'https://ssooutbound-testing.kpininja.com', '2022-02-21 23:06:08', '2022-02-21 17:35:18'),
(5, 2, '198cca00-7eb4-4d19-8074-87f16a1f3038', 'http://localhost:5001', '2022-02-21 23:06:08', '2022-02-21 17:35:18'),
(6, 2, '198cca00-7eb4-4d19-8074-87f16a1f3038', 'http://localhost:5000', '2022-02-21 23:06:08', '2022-02-21 17:35:18'),
(7, 3, 'f4144190-88c1-4b78-a7c5-999c6dd9f355', 'http://3.212.160.215:5001', '2022-02-21 23:06:52', '2022-02-21 17:36:18'),
(8, 3, 'f4144190-88c1-4b78-a7c5-999c6dd9f355', 'https://ssooutbound-testing.kpininja.com', '2022-02-21 23:06:52', '2022-02-21 17:36:18'),
(9, 4, '86c8438d-e98e-4279-8aa1-52efed091adf', 'https://pdmpuat.wi.gov', '2022-02-21 23:07:39', '2022-02-21 17:37:16'),
(10, 4, '86c8438d-e98e-4279-8aa1-52efed091adf', 'https://ssooutbound-testing.kpininja.com', '2022-02-21 23:07:39', '2022-02-21 17:37:16');

-- --------------------------------------------------------

--
-- Table structure for table `ob_oauth_launch_configurations`
--

DROP TABLE IF EXISTS `ob_oauth_launch_configurations`;
CREATE TABLE IF NOT EXISTS `ob_oauth_launch_configurations` (
  `launch_configuration_id` bigint NOT NULL AUTO_INCREMENT,
  `launch_configuration_name` varchar(255) DEFAULT NULL,
  `root_companies_id` bigint DEFAULT NULL COMMENT 'ob_oauth_applications.root_companies_id',
  `client_id` varchar(255) DEFAULT NULL COMMENT 'ob_oauth_applications.client_id',
  `launch_uri` text COMMENT 'Application launch uri',
  `context_tokens` text COMMENT 'Tokens in OAuth 2.0 Context while launching application',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`launch_configuration_id`),
  KEY `root_companies_id` (`root_companies_id`),
  KEY `client_id` (`client_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ob_oauth_launch_configurations`
--

INSERT INTO `ob_oauth_launch_configurations` (`launch_configuration_id`, `launch_configuration_name`, `root_companies_id`, `client_id`, `launch_uri`, `context_tokens`, `created_at`, `updated_at`) VALUES
(1, 'Local App Launch 1', 1, 'e2e13b16-8276-4b8e-8949-13ddadcea83f', 'http://localhost:5001/auth/launch', NULL, '2022-02-21 23:08:45', '2022-02-21 17:38:14'),
(2, 'Dev App Launch 1', 2, '198cca00-7eb4-4d19-8074-87f16a1f3038', 'http://3.212.160.215:5001/auth/launch', NULL, '2022-02-21 23:10:02', '2022-02-21 17:38:53'),
(3, 'Dev App Launch 2', 2, '198cca00-7eb4-4d19-8074-87f16a1f3038', 'http://localhost:5001/auth/launch', NULL, '2022-02-21 23:10:02', '2022-02-21 17:38:53'),
(4, 'Test App Launch 1', 3, 'f4144190-88c1-4b78-a7c5-999c6dd9f355', 'http://3.212.160.215:5001/auth/launch', NULL, '2022-02-21 23:11:19', '2022-02-21 17:40:40'),
(5, 'ePDMP Test Launch 1', 4, '86c8438d-e98e-4279-8aa1-52efed091adf', 'https://pdmpuat.wi.gov/ehr-query/query-launch', NULL, '2022-02-21 23:11:19', '2022-02-21 17:40:40');

-- --------------------------------------------------------

--
-- Table structure for table `ob_oauth_proxy`
--

DROP TABLE IF EXISTS `ob_oauth_proxy`;
CREATE TABLE IF NOT EXISTS `ob_oauth_proxy` (
  `proxy_id` bigint NOT NULL AUTO_INCREMENT,
  `root_companies_id` bigint DEFAULT NULL COMMENT 'ob_oauth_applications.root_companies_id',
  `client_id` varchar(255) DEFAULT NULL COMMENT 'ob_oauth_applications.client_id',
  `launch_token` text COMMENT 'System generated launch token',
  `scope` text COMMENT 'Space-delimited list scopes code can request',
  `context_tokens` text COMMENT 'Tokens in OAuth 2.0 Context while launching application',
  `token_used` enum('0','1') DEFAULT '0' COMMENT 'Launch token status: 0 :- Unused; 1 :- Used',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`proxy_id`),
  KEY `root_companies_id` (`root_companies_id`),
  KEY `client_id` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ob_oauth_redirect_uris`
--

DROP TABLE IF EXISTS `ob_oauth_redirect_uris`;
CREATE TABLE IF NOT EXISTS `ob_oauth_redirect_uris` (
  `redirect_uri_id` bigint NOT NULL AUTO_INCREMENT,
  `root_companies_id` bigint DEFAULT NULL COMMENT 'ob_oauth_applications.root_companies_id',
  `client_id` varchar(255) DEFAULT NULL COMMENT 'ob_oauth_applications.client_id',
  `redirect_uri` text COMMENT 'URI to redirect user after authorization',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`redirect_uri_id`),
  KEY `root_companies_id` (`root_companies_id`),
  KEY `client_id` (`client_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ob_oauth_redirect_uris`
--

INSERT INTO `ob_oauth_redirect_uris` (`redirect_uri_id`, `root_companies_id`, `client_id`, `redirect_uri`, `created_at`, `updated_at`) VALUES
(1, 1, 'e2e13b16-8276-4b8e-8949-13ddadcea83f', 'http://localhost:5001/auth/callback', '2022-02-21 23:11:58', '2022-02-21 17:41:42'),
(2, 2, '198cca00-7eb4-4d19-8074-87f16a1f3038', 'http://3.212.160.215:5001/auth/callback', '2022-02-21 23:12:32', '2022-02-21 17:42:02'),
(3, 2, '198cca00-7eb4-4d19-8074-87f16a1f3038', 'http://localhost:5001/auth/callback', '2022-02-21 23:12:32', '2022-02-21 17:42:02'),
(4, 3, 'f4144190-88c1-4b78-a7c5-999c6dd9f355', 'http://3.212.160.215:5001/auth/callback', '2022-02-21 23:13:09', '2022-02-21 17:43:04'),
(5, 4, '86c8438d-e98e-4279-8aa1-52efed091adf', 'https://pdmpuat.wi.gov/ehr-query/patient-report', '2022-02-21 23:13:27', '2022-02-21 17:43:22');

-- --------------------------------------------------------

--
-- Table structure for table `ob_oauth_scopes`
--

DROP TABLE IF EXISTS `ob_oauth_scopes`;
CREATE TABLE IF NOT EXISTS `ob_oauth_scopes` (
  `scope_id` bigint NOT NULL AUTO_INCREMENT,
  `scope_name` varchar(255) DEFAULT NULL COMMENT 'Name of scope, without spaces',
  `is_default` enum('0','1') DEFAULT '0' COMMENT 'Scope status: 0 :- not default; 1 :- default',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`scope_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ob_oauth_scopes`
--

INSERT INTO `ob_oauth_scopes` (`scope_id`, `scope_name`, `is_default`, `created_at`, `updated_at`) VALUES
(1, 'launch', '0', '2022-02-05 18:37:34', NULL),
(2, 'openid', '0', '2022-02-05 18:37:34', NULL),
(3, 'fhirUser', '0', '2022-02-05 18:37:34', NULL),
(4, 'Patient.Read(R4)', '0', '2022-02-05 18:37:34', NULL);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ob_oauth_access_tokens`
--
ALTER TABLE `ob_oauth_access_tokens`
  ADD CONSTRAINT `ob_oauth_access_tokens_ibfk_1` FOREIGN KEY (`root_companies_id`) REFERENCES `ob_oauth_applications` (`root_companies_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ob_oauth_access_tokens_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `ob_oauth_applications` (`client_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ob_oauth_access_tokens_ibfk_3` FOREIGN KEY (`authorization_code_id`) REFERENCES `ob_oauth_authorization_codes` (`authorization_code_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `ob_oauth_authorization_codes`
--
ALTER TABLE `ob_oauth_authorization_codes`
  ADD CONSTRAINT `ob_oauth_authorization_codes_ibfk_1` FOREIGN KEY (`root_companies_id`) REFERENCES `ob_oauth_applications` (`root_companies_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ob_oauth_authorization_codes_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `ob_oauth_applications` (`client_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `ob_oauth_cors_uris`
--
ALTER TABLE `ob_oauth_cors_uris`
  ADD CONSTRAINT `ob_oauth_cors_uris_ibfk_1` FOREIGN KEY (`root_companies_id`) REFERENCES `ob_oauth_applications` (`root_companies_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ob_oauth_cors_uris_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `ob_oauth_applications` (`client_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `ob_oauth_launch_configurations`
--
ALTER TABLE `ob_oauth_launch_configurations`
  ADD CONSTRAINT `ob_oauth_launch_configurations_ibfk_1` FOREIGN KEY (`root_companies_id`) REFERENCES `ob_oauth_applications` (`root_companies_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ob_oauth_launch_configurations_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `ob_oauth_applications` (`client_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `ob_oauth_proxy`
--
ALTER TABLE `ob_oauth_proxy`
  ADD CONSTRAINT `ob_oauth_proxy_ibfk_1` FOREIGN KEY (`root_companies_id`) REFERENCES `ob_oauth_applications` (`root_companies_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ob_oauth_proxy_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `ob_oauth_applications` (`client_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `ob_oauth_redirect_uris`
--
ALTER TABLE `ob_oauth_redirect_uris`
  ADD CONSTRAINT `ob_oauth_redirect_uris_ibfk_1` FOREIGN KEY (`root_companies_id`) REFERENCES `ob_oauth_applications` (`root_companies_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `ob_oauth_redirect_uris_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `ob_oauth_applications` (`client_id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
